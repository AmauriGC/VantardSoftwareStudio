from django.utils import timezone
from .models import User

def get_active_user(user_id: int) -> User | None:

    try:
        return User.objects.get(pk=user_id, is_active=True, deleted_at__isnull=True)
    except User.DoesNotExist:
        return None


def deactivate_user(user_id: int) -> bool:

    user = get_active_user(user_id)
    if user:
        user.soft_delete()
        return True
    return False

