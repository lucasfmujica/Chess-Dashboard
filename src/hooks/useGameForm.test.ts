import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameForm } from './useGameForm';
import type { ModalContextType } from '../components/modals/ModalContext';

const makeModal = () => {
  const alert = vi.fn().mockResolvedValue(undefined);
  return { alert, modal: { alert, confirm: vi.fn(), prompt: vi.fn() } as unknown as ModalContextType };
};

function fill(result: { current: ReturnType<typeof useGameForm> }) {
  const set = (name: string, value: string) =>
    act(() => result.current.handleInputChange({ target: { name, value, type: 'text' } } as never));
  set('tournament', 'Open');
  set('elo', '2000');
  set('opp', 'Rival');
  set('opp_elo', '1900');
  set('round', '3');
}

describe('useGameForm.handleAddGame', () => {
  it('resets the form and returns true on success', async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const { modal } = makeModal();
    const { result } = renderHook(() => useGameForm([], add, modal));
    fill(result);
    let ok = false;
    await act(async () => {
      ok = await result.current.handleAddGame();
    });
    expect(ok).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    expect(result.current.gameForm.opp).toBe('');
    expect(result.current.gameForm.tournament).toBe('Open');
  });

  it('alerts, keeps the form and returns false when saving fails', async () => {
    const add = vi.fn().mockRejectedValue(new Error('boom'));
    const { modal, alert } = makeModal();
    const { result } = renderHook(() => useGameForm([], add, modal));
    fill(result);
    let ok = true;
    await act(async () => {
      ok = await result.current.handleAddGame();
    });
    expect(ok).toBe(false);
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('boom'), expect.any(String));
    expect(result.current.gameForm.opp).toBe('Rival');
    expect(result.current.gameForm.round).toBe('3');
  });
});
