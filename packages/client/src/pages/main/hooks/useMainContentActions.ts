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

  const handleCreateEvent = useCallback(async () => {
    if (!eventForm.title.trim() || !eventForm.startAt || !eventForm.endAt) return;
    try {
      await eventsApi.create({
        title: eventForm.title.trim(),
        startAt: eventForm.startAt,
        endAt: eventForm.endAt,
        description: eventForm.description.trim() || undefined,
      });
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
