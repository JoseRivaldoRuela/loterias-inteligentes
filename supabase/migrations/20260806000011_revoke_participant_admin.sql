-- Esta conta é participante comum, sem privilégios administrativos.
update public.profiles profile
set
    role = 'user',
    updated_at = now()
from auth.users account
where profile.id = account.id
  and lower(account.email) = lower('jrivaldoruela@gmail.com');

-- Garante que a conta participante não tenha assinatura criada por engano.
delete from public.user_subscriptions subscription
using auth.users account
where subscription.user_id = account.id
  and lower(account.email) = lower('jrivaldoruela@gmail.com');
