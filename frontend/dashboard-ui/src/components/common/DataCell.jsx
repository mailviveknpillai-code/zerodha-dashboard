import React from 'react';
import { useContractColoring } from '../../contexts/ContractColorContext';
import { useTheme } from '../../contexts/ThemeContext';

const DataCell = ({
  value,
  className = '',
  displayValue,
  coloringMeta = null,
  title = null,
}) => {
  const { isDarkMode } = useTheme();
  const { backgroundClass, haloClass } = useContractColoring(coloringMeta, value);

  const baseClasses = [
    'border-r',
    'last:border-r-0',
    isDarkMode ? 'border-slate-700/50' : 'border-slate-200/60',
  ];

  const composedClassName = [...baseClasses, className, backgroundClass, haloClass]
    .filter(Boolean)
    .join(' ');

  return (
    <td className={composedClassName} title={title || undefined}>
      {displayValue ?? (value ?? '')}
    </td>
  );
};

export default DataCell;

