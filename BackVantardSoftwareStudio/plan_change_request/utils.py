# plan_change_requests/utils.py
SOLICITUD_NOT_FOUND = 'Solicitud no encontrada.'

from django.utils import timezone
from django.db import transaction
from .models import PlanChangeRequest
from user_plans.models import UserPlan

def create_plan_change_request(user, requested_plan, reason=''):
    """
    Crea una solicitud de cambio de plan.
    
    Args:
        user: Usuario que solicita el cambio
        requested_plan: Plan al que desea cambiar
        reason: Motivo del cambio (opcional)
    
    Returns:
        PlanChangeRequest: Objeto creado
    
    Raises:
        ValueError: Si no tiene un plan activo o si solicita el mismo plan
    """
    # Obtener el plan activo del usuario
    current_user_plan = UserPlan.objects.filter(
        user=user,
        status=UserPlan.Status.ACTIVE,
        deleted_at__isnull=True
    ).first()
    
    if not current_user_plan:
        raise ValueError('El usuario no tiene un plan activo.')
    
    if current_user_plan.plan.id == requested_plan.id:
        raise ValueError('El plan solicitado es el mismo que el plan actual.')
    
    # Verificar si ya existe una solicitud pendiente
    pending_request = PlanChangeRequest.objects.filter(
        user=user,
        status=PlanChangeRequest.Status.PENDING,
        deleted_at__isnull=True
    ).first()
    
    if pending_request:
        raise ValueError('Ya existe una solicitud de cambio de plan pendiente.')
    
    # Crear la solicitud
    request_obj = PlanChangeRequest.objects.create(
        user=user,
        current_plan=current_user_plan,
        requested_plan=requested_plan,
        reason=reason,
        status=PlanChangeRequest.Status.PENDING
    )
    
    return request_obj


def approve_plan_change_request(request_id, reviewed_by):
    """
    Aprueba una solicitud de cambio de plan.
    
    Args:
        request_id: ID de la solicitud
        reviewed_by: Usuario que aprueba
    
    Returns:
        PlanChangeRequest: Objeto actualizado
    
    Raises:
        ValueError: Si la solicitud no existe o no está pendiente
    """
    try:
        request_obj = PlanChangeRequest.objects.get(id=request_id)
    except PlanChangeRequest.DoesNotExist:
        raise ValueError(SOLICITUD_NOT_FOUND)
    
    if request_obj.status != PlanChangeRequest.Status.PENDING:
        raise ValueError('Solo se pueden aprobar solicitudes pendientes.')
    
    if request_obj.is_deleted:
        raise ValueError('No se puede aprobar una solicitud eliminada.')
    
    request_obj.approve(reviewed_by_user=reviewed_by)
    return request_obj


def reject_plan_change_request(request_id, reviewed_by):
    """
    Rechaza una solicitud de cambio de plan.
    
    Args:
        request_id: ID de la solicitud
        reviewed_by: Usuario que rechaza
    
    Returns:
        PlanChangeRequest: Objeto actualizado
    
    Raises:
        ValueError: Si la solicitud no existe o no está pendiente
    """
    try:
        request_obj = PlanChangeRequest.objects.get(id=request_id)
    except PlanChangeRequest.DoesNotExist:
        raise ValueError(SOLICITUD_NOT_FOUND)
    
    if request_obj.status != PlanChangeRequest.Status.PENDING:
        raise ValueError('Solo se pueden rechazar solicitudes pendientes.')
    
    if request_obj.is_deleted:
        raise ValueError('No se puede rechazar una solicitud eliminada.')
    
    request_obj.reject(reviewed_by_user=reviewed_by)
    return request_obj


@transaction.atomic
def complete_plan_change(request_id):
    """
    Completa el cambio de plan (aplica el cambio efectivamente).
    
    Este método:
    1. Verifica que la solicitud esté aprobada
    2. Cancela el UserPlan actual
    3. Crea un nuevo UserPlan con el plan solicitado
    4. Marca la solicitud como completada
    
    Args:
        request_id: ID de la solicitud aprobada
    
    Returns:
        tuple: (PlanChangeRequest, nuevo UserPlan)
    
    Raises:
        ValueError: Si la solicitud no está aprobada o ya fue completada
    """
    try:
        request_obj = PlanChangeRequest.objects.select_related(
            'user', 'current_plan', 'requested_plan'
        ).get(id=request_id)
    except PlanChangeRequest.DoesNotExist:
        raise ValueError(SOLICITUD_NOT_FOUND)
    
    if request_obj.status != PlanChangeRequest.Status.APPROVED:
        raise ValueError('Solo se pueden completar solicitudes aprobadas.')
    
    if request_obj.is_deleted:
        raise ValueError('No se puede completar una solicitud eliminada.')
    
    # Marcar el plan actual como no vigente
    current_plan = request_obj.current_plan
    current_plan.status = UserPlan.Status.EXPIRED
    current_plan.save(update_fields=['status', 'updated_at'])
    
    # Crear nuevo UserPlan con el plan solicitado
    # Asumimos 1 mes de duración por defecto (esto puede variar según tu lógica)
    from dateutil.relativedelta import relativedelta
    
    months = 1  # Puedes parametrizar esto
    purchase_date = timezone.now()
    expiration_date = purchase_date + relativedelta(months=months)
    total_price = UserPlan.calculate_total(request_obj.requested_plan.price, months)
    
    new_user_plan = UserPlan.objects.create(
        user=request_obj.user,
        plan=request_obj.requested_plan,
        purchase_date=purchase_date,
        expiration_date=expiration_date,
        months_purchased=months,
        total_price_paid=total_price,
        status=UserPlan.Status.ACTIVE
    )
    
    # Marcar solicitud como completada
    request_obj.complete()
    
    return request_obj, new_user_plan


def cancel_plan_change_request(request_id):
    """
    Cancela (soft delete) una solicitud de cambio de plan.
    
    Args:
        request_id: ID de la solicitud
    
    Returns:
        PlanChangeRequest: Objeto cancelado
    
    Raises:
        ValueError: Si la solicitud no existe o ya está completada
    """
    try:
        request_obj = PlanChangeRequest.objects.get(id=request_id)
    except PlanChangeRequest.DoesNotExist:
        raise ValueError(SOLICITUD_NOT_FOUND)
    
    if request_obj.status == PlanChangeRequest.Status.COMPLETED:
        raise ValueError('No se puede cancelar una solicitud ya completada.')
    
    if request_obj.is_deleted:
        raise ValueError('La solicitud ya está cancelada.')
    
    request_obj.soft_delete()
    return request_obj


def get_pending_requests_by_user(user):
    """
    Obtiene todas las solicitudes pendientes de un usuario.
    
    Args:
        user: Usuario
    
    Returns:
        QuerySet: Solicitudes pendientes
    """
    return PlanChangeRequest.objects.filter(
        user=user,
        status=PlanChangeRequest.Status.PENDING,
        deleted_at__isnull=True
    ).select_related('current_plan', 'requested_plan')


def get_all_pending_requests():
    """
    Obtiene todas las solicitudes pendientes del sistema.
    
    Returns:
        QuerySet: Todas las solicitudes pendientes
    """
    return PlanChangeRequest.objects.filter(
        status=PlanChangeRequest.Status.PENDING,
        deleted_at__isnull=True
    ).select_related(
        'user',
        'current_plan',
        'current_plan__plan',
        'requested_plan'
    ).order_by('-created_at')