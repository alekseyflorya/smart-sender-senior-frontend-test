import { Link } from 'react-router';
import type { Webhook } from '../../../api/contract';
import { paths } from '../../../app/paths';
import type { ListLinkState } from '../listLink';

interface WebhookTableProps {
  webhooks: Webhook[];
  /** The list's query string, handed to the edit page for its "back" link. */
  listSearch: string;
}

export function WebhookTable({ webhooks, listSearch }: WebhookTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">URL</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {webhooks.map((webhook) => (
          <tr key={webhook.id}>
            <td>
              <Link
                to={paths.webhook(webhook.id)}
                state={{ listSearch } satisfies ListLinkState}
              >
                {webhook.name}
              </Link>
            </td>
            <td>{webhook.url}</td>
            <td>{webhook.active ? 'Active' : 'Inactive'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
