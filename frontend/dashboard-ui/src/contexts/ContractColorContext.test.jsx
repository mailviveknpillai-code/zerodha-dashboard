import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { ContractColorProvider, useContractColoring } from './ContractColorContext'

describe('ContractColorContext', () => {
  const metaBase = { contractId: 'test-contract', fieldKey: 'ltp' }

  const Harness = ({ value, meta = metaBase }) => {
    const styles = useContractColoring(meta, value)
    return (
      <div>
        <span data-testid="bg">{styles.backgroundClass}</span>
        <span data-testid="halo">{styles.haloClass}</span>
      </div>
    )
  }

  it('applies upward tint when value increases', async () => {
    const { rerender, getByTestId } = render(
      <ContractColorProvider>
        <Harness value={100} />
      </ContractColorProvider>
    )

    await waitFor(() => expect(getByTestId('bg').textContent).toBe(''))

    rerender(
      <ContractColorProvider>
        <Harness value={101} />
      </ContractColorProvider>
    )

    await waitFor(() => expect(getByTestId('bg').textContent).toContain('cell-bg-up'))

    rerender(
      <ContractColorProvider>
        <Harness value={101} />
      </ContractColorProvider>
    )

    await waitFor(() => expect(getByTestId('bg').textContent).toContain('cell-bg-up'))
  })

  it('applies halo when hitting day high', async () => {
    const meta = { ...metaBase, dayHigh: 110 }
    const { rerender, getByTestId } = render(
      <ContractColorProvider>
        <Harness value={100} meta={meta} />
      </ContractColorProvider>
    )

    await waitFor(() => expect(getByTestId('halo').textContent).toBe(''))

    rerender(
      <ContractColorProvider>
        <Harness value={110} meta={meta} />
      </ContractColorProvider>
    )

    await waitFor(() => expect(getByTestId('halo').textContent).toBe('cell-halo-max'))
  })
})
