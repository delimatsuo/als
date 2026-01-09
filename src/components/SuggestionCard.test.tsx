import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionCard } from './SuggestionCard';
import { Suggestion } from '@/stores/app';

describe('SuggestionCard', () => {
  const mockSuggestion: Suggestion = {
    text: 'Hello, how are you?',
    id: '1',
  };

  const defaultProps = {
    suggestion: mockSuggestion,
    onSelect: vi.fn(),
    onSpeakNow: vi.fn(),
    index: 0,
  };

  it('renders suggestion text', () => {
    render(<SuggestionCard {...defaultProps} />);

    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
  });

  it('calls onSelect when main button is clicked', () => {
    const onSelect = vi.fn();
    render(<SuggestionCard {...defaultProps} onSelect={onSelect} />);

    const mainButton = screen.getByRole('button', {
      name: /Option 1: Hello, how are you\?/,
    });
    fireEvent.click(mainButton);

    expect(onSelect).toHaveBeenCalledWith(mockSuggestion);
  });

  it('calls onSpeakNow when speak button is clicked', () => {
    const onSpeakNow = vi.fn();
    render(<SuggestionCard {...defaultProps} onSpeakNow={onSpeakNow} />);

    const speakButton = screen.getByRole('button', {
      name: /Speak now:/,
    });
    fireEvent.click(speakButton);

    expect(onSpeakNow).toHaveBeenCalledWith(mockSuggestion);
  });

  it('does not call onSelect when speak button is clicked', () => {
    const onSelect = vi.fn();
    const onSpeakNow = vi.fn();
    render(
      <SuggestionCard {...defaultProps} onSelect={onSelect} onSpeakNow={onSpeakNow} />
    );

    const speakButton = screen.getByRole('button', {
      name: /Speak now:/,
    });
    fireEvent.click(speakButton);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onSpeakNow).toHaveBeenCalled();
  });

  it('hides speak button when showSpeakNow is false', () => {
    render(<SuggestionCard {...defaultProps} showSpeakNow={false} />);

    expect(
      screen.queryByRole('button', { name: /Speak now:/ })
    ).not.toBeInTheDocument();
  });

  it('shows correct aria label with index', () => {
    render(<SuggestionCard {...defaultProps} index={2} />);

    expect(
      screen.getByRole('button', { name: /Option 3:/ })
    ).toBeInTheDocument();
  });

  it('disables speak button when isPlaying is true', () => {
    render(<SuggestionCard {...defaultProps} isPlaying={true} />);

    const speakButton = screen.getByRole('button', { name: /Speak now:/ });
    expect(speakButton).toBeDisabled();
  });

  it('applies selected styles when isSelected is true', () => {
    const { container } = render(
      <SuggestionCard {...defaultProps} isSelected={true} />
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-blue-500');
  });

  it('applies playing styles when isPlaying is true', () => {
    const { container } = render(
      <SuggestionCard {...defaultProps} isPlaying={true} />
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-green-500');
  });
});
