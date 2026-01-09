import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationHeader } from './ConversationHeader';

describe('ConversationHeader', () => {
  const defaultProps = {
    onEndConversation: vi.fn(),
  };

  it('renders "In Conversation" indicator', () => {
    render(<ConversationHeader {...defaultProps} />);

    expect(screen.getByText('In Conversation')).toBeInTheDocument();
  });

  it('renders End button', () => {
    render(<ConversationHeader {...defaultProps} />);

    expect(screen.getByRole('button', { name: /End conversation/ })).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
  });

  it('calls onEndConversation when End button is clicked', () => {
    const onEndConversation = vi.fn();
    render(<ConversationHeader onEndConversation={onEndConversation} />);

    fireEvent.click(screen.getByRole('button', { name: /End conversation/ }));

    expect(onEndConversation).toHaveBeenCalled();
  });

  it('displays last message when provided', () => {
    render(
      <ConversationHeader
        {...defaultProps}
        lastMessage="How are you feeling today?"
      />
    );

    expect(screen.getByText('They said')).toBeInTheDocument();
    expect(screen.getByText(/How are you feeling today\?/)).toBeInTheDocument();
  });

  it('does not display last message section when not provided', () => {
    render(<ConversationHeader {...defaultProps} />);

    expect(screen.queryByText('They said')).not.toBeInTheDocument();
  });

  it('does not display last message section when null', () => {
    render(<ConversationHeader {...defaultProps} lastMessage={null} />);

    expect(screen.queryByText('They said')).not.toBeInTheDocument();
  });

  it('shows "Listening..." indicator when isListening is true', () => {
    render(<ConversationHeader {...defaultProps} isListening={true} />);

    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('does not show "Listening..." indicator when isListening is false', () => {
    render(<ConversationHeader {...defaultProps} isListening={false} />);

    expect(screen.queryByText('Listening...')).not.toBeInTheDocument();
  });

  it('shows "Generating responses..." indicator when isGenerating is true', () => {
    render(<ConversationHeader {...defaultProps} isGenerating={true} />);

    expect(screen.getByText('Generating responses...')).toBeInTheDocument();
  });

  it('does not show "Generating responses..." indicator when isGenerating is false', () => {
    render(<ConversationHeader {...defaultProps} isGenerating={false} />);

    expect(screen.queryByText('Generating responses...')).not.toBeInTheDocument();
  });

  it('can show both listening and generating indicators simultaneously', () => {
    render(
      <ConversationHeader
        {...defaultProps}
        isListening={true}
        isGenerating={true}
      />
    );

    expect(screen.getByText('Listening...')).toBeInTheDocument();
    expect(screen.getByText('Generating responses...')).toBeInTheDocument();
  });
});
