import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../../api';
import type { Event } from '../../../api';
import { ollamaChat, type OllamaMessage } from '../../../ollama';
import { normalizeTimeRange, toLocalInputValue } from '../utils/date';

type EventFormState = {
  title: string;
  startAt: string;
  endAt: string;
  description: string;
};

export type ScheduleCreateOptions =
  | { mode?: 'normal' }
  | { mode: 'period'; periodStartDate: string; periodEndDate: string }
  | { mode: 'repeat'; repeatType: 'daily' | 'weekly' | 'monthly'; repeatUntil: string };

const toLocalInputDateTime = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

type Params = {
  queryClient: QueryClient;
  selectedDate: string;
  setEditingEventId: Dispatch<SetStateAction<string | null>>;
  setEventForm: Dispatch<SetStateAction<EventFormState>>;
  editingEventId: string | null;
  eventForm: EventFormState;
  aiInput: string;
  aiLoading: boolean;
  aiMessages: OllamaMessage[];
  setAiInput: Dispatch<SetStateAction<string>>;
  setAiMessages: Dispatch<SetStateAction<OllamaMessage[]>>;
  setAiLoading: Dispatch<SetStateAction<boolean>>;
  navigate: (to: string) => void;
  openChatWindow: (roomId: string) => void;
};

export function useMainContentActions({
  queryClient,
  selectedDate,
  setEditingEventId,
  setEventForm,
  editingEventId,
  eventForm,
  aiInput,
  aiLoading,
  aiMessages,
  setAiInput,
  setAiMessages,
  setAiLoading,
  navigate,
  openChatWindow,
}: Params) {
  const handleEditEvent = useCallback((ev: Event) => {
    setEditingEventId(ev.id);
    setEventForm({
      title: ev.title,
      startAt: toLocalInputValue(ev.startAt),
      endAt: toLocalInputValue(ev.endAt),
      description: ev.description ?? '',
    });
  }, [setEditingEventId, setEventForm]);

  const handleCancelEventEdit = useCallback(() => {
    setEditingEventId(null);
    setEventForm({ title: '', startAt: '', endAt: '', description: '' });
  }, [setEditingEventId, setEventForm]);

  const handleUpdateEvent = useCallback(async () => {
    if (!editingEventId || !eventForm.title.trim() || !eventForm.startAt || !eventForm.endAt) return;
    try {
      await eventsApi.update(editingEventId, {
        title: eventForm.title.trim(),
        startAt: eventForm.startAt,
        endAt: eventForm.endAt,
        description: eventForm.description.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEditingEventId(null);
      const n = normalizeTimeRange(selectedDate, eventForm.startAt, eventForm.endAt);
      setEventForm({ title: '', startAt: n.startAt, endAt: n.endAt, description: '' });
    } catch (err) {
      console.error(err);
    }
  }, [editingEventId, eventForm, queryClient, selectedDate, setEditingEventId, setEventForm]);

  const handleCreateEvent = useCallback(async (options?: ScheduleCreateOptions) => {
    if (!eventForm.title.trim() || !eventForm.startAt || !eventForm.endAt) return;

    const mode = options?.mode ?? 'normal';
    const parsedStart = new Date(eventForm.startAt);
    const parsedEnd = new Date(eventForm.endAt);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) return;

    const durationMs = Math.max(60 * 60 * 1000, parsedEnd.getTime() - parsedStart.getTime());
    const title = eventForm.title.trim();
    const description = eventForm.description.trim() || undefined;

    try {
      if (mode === 'period') {
        const periodStartDate = options.periodStartDate;
        const periodEndDate = options.periodEndDate;
        if (!periodStartDate || !periodEndDate) return;
        const startAt = `${periodStartDate}T${eventForm.startAt.slice(11, 16) || '09:00'}`;
        const endAt = `${periodEndDate}T${eventForm.endAt.slice(11, 16) || '18:00'}`;
        await eventsApi.create({ title, startAt, endAt, description });
      } else if (mode === 'repeat') {
        const repeatUntil = options.repeatUntil;
        if (!repeatUntil) return;

        const untilDate = new Date(`${repeatUntil}T23:59:59`);
        if (Number.isNaN(untilDate.getTime()) || parsedStart.getTime() > untilDate.getTime()) return;

        const maxOccurrences = 180;
        const occurrences: { startAt: string; endAt: string }[] = [];
        let cursor = new Date(parsedStart);
        while (cursor.getTime() <= untilDate.getTime() && occurrences.length < maxOccurrences) {
          const occStart = new Date(cursor);
          const occEnd = new Date(occStart.getTime() + durationMs);
          occurrences.push({
            startAt: toLocalInputDateTime(occStart),
            endAt: toLocalInputDateTime(occEnd),
          });
          if (options.repeatType === 'daily') cursor.setDate(cursor.getDate() + 1);
          if (options.repeatType === 'weekly') cursor.setDate(cursor.getDate() + 7);
          if (options.repeatType === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
        }

        for (const occ of occurrences) {
          await eventsApi.create({ title, startAt: occ.startAt, endAt: occ.endAt, description });
        }
      } else {
        await eventsApi.create({
          title,
          startAt: eventForm.startAt,
          endAt: eventForm.endAt,
          description,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['events'] });
      const n = normalizeTimeRange(selectedDate, eventForm.startAt, eventForm.endAt);
      setEventForm({ title: '', startAt: n.startAt, endAt: n.endAt, description: '' });
    } catch (err) {
      console.error(err);
    }
  }, [eventForm, queryClient, selectedDate, setEventForm]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      await eventsApi.delete(eventId);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (err) {
      console.error(err);
    }
  }, [queryClient]);

  const handleResetAi = useCallback(() => {
    setAiMessages([]);
  }, [setAiMessages]);

  const handleSubmitAi = useCallback(async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiInput('');
    const userMsg: OllamaMessage = { role: 'user', content: text };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiLoading(true);
    try {
      const reply = await ollamaChat([...aiMessages, userMsg]);
      setAiMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setAiMessages((prev) => [...prev, { role: 'assistant', content: `오류: ${(err as Error).message}` }]);
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, aiLoading, aiMessages, setAiInput, setAiLoading, setAiMessages]);

  const handleOpenChatInNewWindow = useCallback((roomId: string) => {
    openChatWindow(roomId);
    navigate('/');
  }, [navigate, openChatWindow]);

  return {
    handleEditEvent,
    handleCancelEventEdit,
    handleUpdateEvent,
    handleCreateEvent,
    handleDeleteEvent,
    handleResetAi,
    handleSubmitAi,
    handleOpenChatInNewWindow,
  };
}
