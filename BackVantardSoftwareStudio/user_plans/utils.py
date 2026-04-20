from django.utils import timezone
from .models import UserPlan

def get_active_plan(user_id: int) -> UserPlan | None:

    return (
        UserPlan.objects
        .select_related('plan')
        .filter(
            user_id=user_id,
            status=UserPlan.Status.ACTIVE,
            expiration_date__gt=timezone.now(),
            deleted_at__isnull=True
        )
        .order_by('-purchase_date')
        .first()
    )

def get_plan_history(user_id: int):

    return (
        UserPlan.objects
        .select_related('plan')
        .filter(user_id=user_id)
        .order_by('-purchase_date')
    )

def cancel_active_plans(user_id: int) -> int:

    plans = UserPlan.objects.filter(
        user_id=user_id,
        status=UserPlan.Status.ACTIVE,
        deleted_at__isnull=True
    )
    
    count = plans.count()

    plans.update(
        status=UserPlan.Status.EXPIRED,
        deleted_at=timezone.now(),
        updated_at=timezone.now()
    )
    return count


def user_has_active_plan(user_id: int) -> bool:

    return get_active_plan(user_id) is not None

