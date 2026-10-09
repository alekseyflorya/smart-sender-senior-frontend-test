import { Link, useLocation, useParams } from 'react-router';
import { z } from 'zod';
import { isApiError } from '../../api/errors';
import { ErrorMessage } from '../../shared/ErrorMessage';
import { Loading } from '../../shared/Loading';
import { getListHref } from './listLink';
import { useWebhook } from './useWebhook';
import { WebhookForm } from './WebhookForm';

// The id comes from the URL, so "abc" or "-1" is treated like a missing webhook.
const webhookIdSchema = z.coerce.number().int().positive();

export function WebhookEditPage() {
  const params = useParams();
  const location = useLocation();
  const listHref = getListHref(location.state);
  const id = webhookIdSchema.safeParse(params.id);

  return (
    <section>
      <Link to={listHref}>← Back to webhooks</Link>
      {id.success ? (
        <WebhookEditor id={id.data} listHref={listHref} />
      ) : (
        <NotFound />
      )}
    </section>
  );
}

function WebhookEditor({ id, listHref }: { id: number; listHref: string }) {
  const query = useWebhook(id);

  if (query.isPending) return <Loading />;
  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) {
      return <NotFound />;
    }
    return (
      <ErrorMessage
        message="Could not load the webhook."
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  return (
    <>
      <h1>Edit webhook</h1>
      {/* Keyed by id so the form's default values always match the loaded webhook. */}
      <WebhookForm
        key={query.data.id}
        webhook={query.data}
        listHref={listHref}
      />
    </>
  );
}

function NotFound() {
  return <h1>Webhook not found</h1>;
}
