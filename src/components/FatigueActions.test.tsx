import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FatigueActions } from './FatigueActions';

describe('FatigueActions', () => {
  const defaultProps = {
    onSelect: vi.fn(),
  };

  it('renders all fatigue action buttons', () => {
    render(<FatigueActions {...defaultProps} />);

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('I need rest')).toBeInTheDocument();
    expect(screen.getByText("Let's talk later")).toBeInTheDocument();
  });

  it('calls onSelect with correct text when Yes is clicked', () => {
    const onSelect = vi.fn();
    render(<FatigueActions onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Yes'));

    expect(onSelect).toHaveBeenCalledWith('Yes');
  });

  it('calls onSelect with correct text when No is clicked', () => {
    const onSelect = vi.fn();
    render(<FatigueActions onSelect={onSelect} />);

    fireEvent.click(screen.getByText('No'));

    expect(onSelect).toHaveBeenCalledWith('No');
  });

  it('calls onSelect with correct text when "I need rest" is clicked', () => {
    const onSelect = vi.fn();
    render(<FatigueActions onSelect={onSelect} />);

    fireEvent.click(screen.getByText('I need rest'));

    expect(onSelect).toHaveBeenCalledWith('I need rest');
  });

  it('calls onSelect with correct text when "Let\'s talk later" is clicked', () => {
    const onSelect = vi.fn();
    render(<FatigueActions onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Let's talk later"));

    expect(onSelect).toHaveBeenCalledWith("Let's talk later");
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<FatigueActions {...defaultProps} disabled={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('enables all buttons when disabled prop is false', () => {
    render(<FatigueActions {...defaultProps} disabled={false} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).not.toBeDisabled();
    });
  });
});
