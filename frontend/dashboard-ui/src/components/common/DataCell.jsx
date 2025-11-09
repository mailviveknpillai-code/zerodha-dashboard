import React from 'react';
import { useContractColoring } from '../../contexts/ContractColorContext';

const BASE_CLASSES = 'border-r border-slate-200/60 dark:border-slate-700/50 last:border-r-0';

const DataCell = ({
  value,
  className = '',
  displayValue,
  coloringMeta = null,
}) => {
  const { backgroundClass, haloClass } = useContractColoring(coloringMeta, value);
  const composedClassName = [BASE_CLASSES, className, backgroundClass, haloClass].filter(Boolean).join(' ');

  return (
    <td className={composedClassName}>
      {displayValue ?? (value ?? '')}
    </td>
  );
};

export default DataCell;

