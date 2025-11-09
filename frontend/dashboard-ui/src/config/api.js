export async function fetchStock(symbol) {
  const res = await fetch(`/api/market/${symbol}`);
  return res.json();
}
