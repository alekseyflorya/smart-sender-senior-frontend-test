import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { Webhook } from '../../../api/contract';
import { setServerErrors } from '../../../shared/setServerErrors';
import { TextField } from '../../../shared/TextField';
import { StatusBadge } from '../StatusBadge';
import { webhookFormSchema, type WebhookFormValues } from './schemas';
import { useUpdateWebhook } from './useUpdateWebhook';

interface WebhookFormProps {
  webhook: Webhook;
  listHref: string;
}

export function WebhookForm({ webhook, listHref }: WebhookFormProps) {
  const navigate = useNavigate();
  const updateWebhook = useUpdateWebhook(webhook.id);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: { name: webhook.name, url: webhook.url },
  });

  async function onSubmit(values: WebhookFormValues) {
    try {
      await updateWebhook.mutateAsync(values);
    } catch (error) {
      setServerErrors(error, setError, ['name', 'url']);
      return;
    }
    // replace: going back from the list must not reopen the saved form.
    void navigate(listHref, { replace: true });
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <TextField
        label="Name"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="URL"
        type="url"
        error={errors.url?.message}
        {...register('url')}
      />
      {/* Read-only: the contract's PUT accepts only name and url. */}
      <p className="form-static">
        Status: <StatusBadge active={webhook.active} />
      </p>
      {errors.root?.server && (
        <p role="alert" className="form-error">
          {errors.root.server.message}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        <Link to={listHref}>Cancel</Link>
      </div>
    </form>
  );
}
