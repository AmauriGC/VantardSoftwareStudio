from .models import Plan

def get_active_plans():
    
    return Plan.objects.filter(status=Plan.StatusChoices.ACTIVE, deleted_at__isnull=True)

def get_plan(plan_id: int) -> Plan | None:
    
    try:
        return Plan.objects.get(pk=plan_id, status=Plan.StatusChoices.ACTIVE, deleted_at__isnull=True)
    except Plan.DoesNotExist:
        return None

def get_free_plan() -> Plan | None:
    
    return Plan.objects.filter(price=0, status=Plan.StatusChoices.ACTIVE, deleted_at__isnull=True).first()

