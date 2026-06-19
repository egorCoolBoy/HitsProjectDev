import { formatCurrency } from '../../utils/format';

type MoneyAmountProps = {
  value: number;
  className?: string;
};

export function MoneyAmount({ value, className = '' }: MoneyAmountProps) {
  return <span className={className}>{formatCurrency(value)}</span>;
}
