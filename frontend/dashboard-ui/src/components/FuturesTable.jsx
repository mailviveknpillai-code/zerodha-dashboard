import React from 'react';

const mockRows = [
  { segment: 'TATACAP', ltp: 432.5, change: 1.2, oi: 18, vol: 280, bid: 558 },
  { segment: 'Call (435)', ltp: 18.5, change: 14.3, oi: 31, vol: 806, bid: 388 },
  { segment: 'ITM (485)', ltp: 12.8, change: 130, oi: 28, vol: 242, bid: 391 },
  { segment: 'Put (440)', ltp: 20.1, change: 30.9, oi: 45, vol: 202, bid: 437 },
];

export default function FuturesTable() {
  return (
    <div className="bg-white rounded border p-3 overflow-x-auto">
      <h3 className="font-semibold mb-3">FUTURES</h3>
      <table className="w-full text-sm">
        <thead className="text-gray-500 border-b text-xs">
          <tr>
            <th className="text-left">Segment</th>
            <th>LTP</th>
            <th>Δ Price</th>
            <th>%Δ</th>
            <th>OI</th>
            <th>Vol</th>
            <th>Bid/Ask</th>
          </tr>
        </thead>
        <tbody>
          {mockRows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-blue-50">
              <td className="py-1">{row.segment}</td>
              <td>{row.ltp}</td>
              <td className={row.change > 0 ? 'text-green-600' : 'text-red-600'}>
                {row.change}
              </td>
              <td>{(row.change / 100).toFixed(2)}%</td>
              <td>{row.oi}</td>
              <td>{row.vol}</td>
              <td>{row.bid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
