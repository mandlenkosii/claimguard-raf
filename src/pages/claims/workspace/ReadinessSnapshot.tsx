import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { CategoryBar, ReadinessRing } from '@/components/domain/Readiness';
import { Card } from '@/components/ui/Card';
import { getReadiness } from '@/features/readiness/api';
import { READINESS_CATEGORIES } from '@/features/readiness/categories';
import { TXT } from '@/lib/format/messages';

/** The Readiness snapshot card on S14. */
export function ReadinessSnapshot({ claimId }: { claimId: string }) {
  const readiness = useQuery({ queryKey: ['readiness', claimId], queryFn: () => getReadiness(claimId) });
  const assessment = readiness.data?.assessment;
  return (
    <Card
      title="Readiness snapshot"
      actions={
        <Link to={`/claims/${claimId}/readiness`} className="text-small font-medium text-accent hover:underline">
          View readiness
        </Link>
      }
    >
      {assessment ? (
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2">
            <ReadinessRing value={assessment.score} size="large" />
            <p className="text-small font-semibold text-error">{`${assessment.blocking_count} blocking issue${assessment.blocking_count === 1 ? '' : 's'}`}</p>
            <p className="text-small font-semibold text-warning">{`${assessment.warning_count} warning${assessment.warning_count === 1 ? '' : 's'}`}</p>
          </div>
          <div className="space-y-3">
            {READINESS_CATEGORIES.map((category) => (
              <CategoryBar key={category.key} label={category.label} value={assessment.category_scores[category.key]} weight={readiness.data!.weights[category.key]} />
            ))}
          </div>
        </div>
      ) : readiness.isSuccess ? (
        <p className="text-body text-text-secondary">{TXT[51]}</p>
      ) : null}
    </Card>
  );
}

