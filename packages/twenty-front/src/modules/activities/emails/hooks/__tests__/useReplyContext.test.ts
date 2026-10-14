import { renderHook } from '@testing-library/react';
import { ConnectedAccountProvider } from 'twenty-shared/types';

import { useEmailThread } from '@/activities/emails/hooks/useEmailThread';
import { useReplyContext } from '@/activities/emails/hooks/useReplyContext';
import { MessageChannelType } from '~/generated-metadata/graphql';

jest.mock('@/activities/emails/hooks/useEmailThread', () => ({
  useEmailThread: jest.fn(),
}));

const mockedUseEmailThread = useEmailThread as jest.MockedFunction<
  typeof useEmailThread
>;

const buildThread = (
  messageChannelType: MessageChannelType,
): ReturnType<typeof useEmailThread> => ({
  thread: undefined,
  messages: [],
  messageThreadExternalId: 'sms:+15550001111:+15550002222',
  connectedAccountId: 'account-1',
  connectedAccountHandle: '+15550001111',
  connectedAccountProvider: ConnectedAccountProvider.APP,
  messageChannelId: 'channel-1',
  messageChannelType,
  messageChannelHandle: '+15550001111',
  threadLoading: false,
  messageChannelLoading: false,
  lastMessageExternalId: 'SM1',
  fetchMoreMessages: jest.fn(),
  refetchMessages: jest.fn(),
});

describe('useReplyContext', () => {
  it('offers no email reply on an app channel thread', () => {
    mockedUseEmailThread.mockReturnValue(buildThread(MessageChannelType.APP));

    const { result } = renderHook(() => useReplyContext('thread-1'));

    expect(result.current).toBeNull();
  });
});
