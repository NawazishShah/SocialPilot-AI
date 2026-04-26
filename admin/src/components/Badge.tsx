interface BadgeProps {
  status: 'draft' | 'approved' | 'posted' | 'archived' | 'failed' | 'pending' | 'success';
}

const statusStyles = {
  draft: 'bg-gray-100 text-gray-800',
  approved: 'bg-green-100 text-green-800',
  posted: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  success: 'bg-green-100 text-green-800',
};

const statusLabels = {
  draft: 'Draft',
  approved: 'Approved',
  posted: 'Posted',
  archived: 'Archived',
  failed: 'Failed',
  pending: 'Pending',
  success: 'Success',
};

export default function Badge({ status }: BadgeProps) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
