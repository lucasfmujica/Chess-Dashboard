import { useState } from 'react';
import { CheckCircleIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useHomework } from '../../../../hooks/useHomework';
import { localDateKey } from '../../../../utils/localDate';
import { Card, Button, Badge } from '../../../ui';
import {
  isHomeworkOverdue,
  type Homework,
  type HomeworkKind,
  type ConceptCategory,
} from '../../../../types/training';
import ConceptQuickAdd from '../../ConceptQuickAdd';

/**
 * Homework assigned by the coaches.
 *
 * This exists because the assignments were evaporating: they are given
 * verbally, without commitment language, so nothing downstream captured them
 * and they survived only in memory between one class and the next.
 */

const KINDS: { value: HomeworkKind; label: string }[] = [
  { value: 'final', label: 'Final' },
  { value: 'calculo', label: 'Cálculo' },
  { value: 'repertorio', label: 'Repertorio' },
  { value: 'concepto', label: 'Concepto' },
  { value: 'lectura', label: 'Lectura' },
  { value: 'partida', label: 'Partida' },
];

const COACHES = ['Toto', 'Juan Cruz'];

/** 'Juan Cruz' -> 'lesson-juan-cruz', so sourceType stays a usable key. */
const coachSource = (coach: string) => `lesson-${coach.trim().toLowerCase().replace(/\s+/g, '-')}`;

/** The homework kinds that map cleanly onto a concept category. */
const KIND_CATEGORY: Partial<Record<HomeworkKind, ConceptCategory>> = {
  final: 'endgame',
  calculo: 'calculation',
  repertorio: 'opening',
};

const INPUT_CLASS =
  'w-full px-3 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent text-sm';

const emptyDraft = (): Partial<Homework> => ({
  coach: 'Toto',
  task: '',
  kind: 'final',
  assignedDate: localDateKey(),
});

const HomeworkPanel = () => {
  const { items, overdue, loading, error, todayKey, add, setStatus, remove } = useHomework();
  const [draft, setDraft] = useState<Partial<Homework> | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft?.task?.trim() || !draft?.coach?.trim()) return;
    setSaving(true);
    try {
      await add([draft]);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const open = items.filter(h => h.status !== 'hecho');
  const done = items.filter(h => h.status === 'hecho');

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-h2 text-fg">Tarea de las clases</h2>
            <p className="text-sm text-fg-muted mt-1">
              Toto y Juan Cruz asignan hablando, sin fecha ni compromiso explícito. Si no queda
              acá, se pierde.
            </p>
          </div>
          <div className="text-right">
            <div className={`text-h2 nums ${overdue.length > 0 ? 'text-loss' : 'text-fg'}`}>
              {overdue.length}
            </div>
            <div className="text-xs text-fg-muted">vencida{overdue.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div className="mt-4">
          <Button icon={PlusIcon} onClick={() => setDraft(emptyDraft())}>
            Cargar tarea
          </Button>
        </div>
      </Card>

      {error && (
        <Card>
          <p className="text-sm text-loss">{error}</p>
        </Card>
      )}

      {draft && (
        <Card>
          <h3 className="text-h3 text-fg mb-4">Nueva tarea</h3>
          <div className="space-y-4">
            <div>
              <label className="text-label block mb-1">Consigna</label>
              <textarea
                className={INPUT_CLASS}
                rows={3}
                placeholder="Ej: jugar el final de torres 4v3 mismo flanco contra el bot nivel 4+, 4 veces: 2 con blancas a ganar, 2 con negras a empatar"
                value={draft.task ?? ''}
                onChange={e => setDraft({ ...draft, task: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="text-label block mb-1">Profe</label>
                <select
                  className={INPUT_CLASS}
                  value={draft.coach ?? 'Toto'}
                  onChange={e => setDraft({ ...draft, coach: e.target.value })}
                >
                  {COACHES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-label block mb-1">Tipo</label>
                <select
                  className={INPUT_CLASS}
                  value={draft.kind ?? ''}
                  onChange={e =>
                    setDraft({ ...draft, kind: (e.target.value || undefined) as HomeworkKind })
                  }
                >
                  <option value="">Sin tipo</option>
                  {KINDS.map(k => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-label block mb-1">Asignada</label>
                <input
                  type="date"
                  className={INPUT_CLASS}
                  value={draft.assignedDate ?? ''}
                  onChange={e => setDraft({ ...draft, assignedDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-label block mb-1">Vence</label>
                <input
                  type="date"
                  className={INPUT_CLASS}
                  value={draft.dueDate ?? ''}
                  onChange={e => setDraft({ ...draft, dueDate: e.target.value || undefined })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void save()} disabled={!draft.task?.trim() || saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button variant="secondary" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <Card>
          <p className="text-sm text-fg-muted">Cargando…</p>
        </Card>
      ) : open.length === 0 ? (
        <Card>
          <p className="text-sm text-fg-muted">
            No hay tarea pendiente. Después de cada clase, cargá acá lo que te pidieron.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {open.map(hw => (
            <HomeworkRow
              key={hw.id}
              hw={hw}
              todayKey={todayKey}
              onDone={() => void setStatus(hw.id, 'hecho')}
              onRemove={() => void remove(hw.id)}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <Card>
          <h3 className="text-h3 text-fg mb-3">Hechas</h3>
          <ul className="space-y-2">
            {done.map(hw => (
              <li key={hw.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-fg-muted line-through">{hw.task}</span>
                <button
                  onClick={() => void setStatus(hw.id, 'pendiente')}
                  className="text-xs text-accent shrink-0 hover:underline"
                >
                  reabrir
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

interface HomeworkRowProps {
  hw: Homework;
  todayKey: string;
  onDone: () => void;
  onRemove: () => void;
}

const HomeworkRow = ({ hw, todayKey, onDone, onRemove }: HomeworkRowProps) => {
  const late = isHomeworkOverdue(hw, todayKey);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={late ? 'loss' : 'accent'}>{hw.coach}</Badge>
            {hw.kind && <Badge>{KINDS.find(k => k.value === hw.kind)?.label ?? hw.kind}</Badge>}
            {hw.dueDate && (
              <span className={`text-xs nums ${late ? 'text-loss' : 'text-fg-muted'}`}>
                {late ? 'venció' : 'vence'} {hw.dueDate}
              </span>
            )}
          </div>
          <p className="text-sm text-fg mt-2">{hw.task}</p>
          {hw.notes && <p className="text-xs text-fg-muted mt-1">{hw.notes}</p>}
          {/* The other place concepts are actually born: something the coach
              said in class. Prefilled with the task and who set it. */}
          <div className="mt-2">
            <ConceptQuickAdd
              defaults={{
                name: hw.task.slice(0, 80),
                category: (hw.kind && KIND_CATEGORY[hw.kind]) ?? 'middlegame',
                sourceType: coachSource(hw.coach),
                sourceChapter: hw.assignedDate,
                summary: hw.task,
              }}
            />
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onDone}
            className="p-1.5 text-win hover:bg-win/10 rounded-lg"
            aria-label="Marcar como hecha"
          >
            <CheckCircleIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 text-loss hover:bg-loss/10 rounded-lg"
            aria-label="Borrar tarea"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default HomeworkPanel;
