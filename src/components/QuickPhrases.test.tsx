import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPhrases } from './QuickPhrases';
import { QuickPhrase } from '@/stores/app';

describe('QuickPhrases', () => {
  const mockPhrases: QuickPhrase[] = [
    { id: '1', text: 'Yes', category: 'Basics' },
    { id: '2', text: 'No', category: 'Basics' },
    { id: '3', text: 'Thank you', category: 'Basics' },
    { id: '4', text: 'I need help', category: 'Needs' },
    { id: '5', text: 'I need water', category: 'Needs' },
    { id: '6', text: 'I am tired', category: 'Feelings' },
    { id: '7', text: 'I am happy', category: 'Feelings' },
  ];

  const defaultProps = {
    phrases: mockPhrases,
    onSelect: vi.fn(),
    isExpanded: false,
    onToggle: vi.fn(),
  };

  describe('collapsed view', () => {
    it('renders top 5 phrases when collapsed', () => {
      render(<QuickPhrases {...defaultProps} />);

      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
      expect(screen.getByText('Thank you')).toBeInTheDocument();
      expect(screen.getByText('I need help')).toBeInTheDocument();
      expect(screen.getByText('I need water')).toBeInTheDocument();
    });

    it('shows +N more button when there are more than 5 phrases', () => {
      render(<QuickPhrases {...defaultProps} />);

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('does not show +N more when 5 or fewer phrases', () => {
      const fewPhrases = mockPhrases.slice(0, 5);
      render(<QuickPhrases {...defaultProps} phrases={fewPhrases} />);

      expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
    });

    it('calls onSelect when a phrase is clicked', () => {
      const onSelect = vi.fn();
      render(<QuickPhrases {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Yes'));

      expect(onSelect).toHaveBeenCalledWith(mockPhrases[0]);
    });

    it('calls onToggle when +N more button is clicked', () => {
      const onToggle = vi.fn();
      render(<QuickPhrases {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByText('+2 more'));

      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('expanded view', () => {
    it('shows "Quick Phrases" header when expanded', () => {
      render(<QuickPhrases {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Quick Phrases')).toBeInTheDocument();
    });

    it('shows "Show less" button when expanded', () => {
      render(<QuickPhrases {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    it('calls onToggle when "Show less" is clicked', () => {
      const onToggle = vi.fn();
      render(<QuickPhrases {...defaultProps} isExpanded={true} onToggle={onToggle} />);

      fireEvent.click(screen.getByText('Show less'));

      expect(onToggle).toHaveBeenCalled();
    });

    it('shows all phrases when expanded', () => {
      render(<QuickPhrases {...defaultProps} isExpanded={true} />);

      mockPhrases.forEach((phrase) => {
        expect(screen.getByText(phrase.text)).toBeInTheDocument();
      });
    });

    it('groups phrases by category', () => {
      render(<QuickPhrases {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Basics')).toBeInTheDocument();
      expect(screen.getByText('Needs')).toBeInTheDocument();
      expect(screen.getByText('Feelings')).toBeInTheDocument();
    });
  });

  describe('learned phrases', () => {
    it('prioritizes learned phrases at the top', () => {
      const learnedPhrases = [
        { text: 'Good morning', useCount: 10, lastUsed: Date.now(), hourlyUsage: {} },
      ];

      render(
        <QuickPhrases
          {...defaultProps}
          learnedPhrases={learnedPhrases}
        />
      );

      // Good morning should be visible (it's learned)
      expect(screen.getByText('Good morning')).toBeInTheDocument();
    });

    it('shows learned phrases with different styling', () => {
      const learnedPhrases = [
        { text: 'Learned phrase', useCount: 5, lastUsed: Date.now(), hourlyUsage: {} },
      ];

      render(
        <QuickPhrases
          {...defaultProps}
          learnedPhrases={learnedPhrases}
        />
      );

      const learnedButton = screen.getByText('Learned phrase');
      expect(learnedButton.className).toContain('bg-blue-100');
    });

    it('shows "Frequent" category in expanded view for learned phrases', () => {
      const learnedPhrases = [
        { text: 'Frequent phrase', useCount: 5, lastUsed: Date.now(), hourlyUsage: {} },
      ];

      render(
        <QuickPhrases
          {...defaultProps}
          isExpanded={true}
          learnedPhrases={learnedPhrases}
        />
      );

      expect(screen.getByText('Frequent')).toBeInTheDocument();
    });

    it('filters out duplicate phrases that exist in both learned and default', () => {
      const learnedPhrases = [
        { text: 'Yes', useCount: 10, lastUsed: Date.now(), hourlyUsage: {} }, // Same as default
      ];

      render(
        <QuickPhrases
          {...defaultProps}
          isExpanded={true}
          learnedPhrases={learnedPhrases}
        />
      );

      // "Yes" should only appear once (from learned)
      const yesButtons = screen.getAllByText('Yes');
      expect(yesButtons).toHaveLength(1);
    });
  });
});
