// @ts-nocheck
import { describe, expect, it, vi } from 'vitest';
import { useDrag } from './useDrag';

describe('useDrag Composable', () => {
  describe('Basic Drag Tracking', () => {
    it('initializes with zero offset and not dragging', () => {
      const mockDismiss = vi.fn();
      const { dragOffset, isDragging } = useDrag(mockDismiss);

      expect(dragOffset.value).toBe(0);
      expect(isDragging.value).toBe(false);
    });

    it('sets isDragging on touch start', () => {
      const mockDismiss = vi.fn();
      const { isDragging, handleTouchStart } = useDrag(mockDismiss);

      const event = {
        touches: [{ clientX: 100 }],
      };

      handleTouchStart(event);

      expect(isDragging.value).toBe(true);
    });

    it('tracks drag offset on touch move', () => {
      const mockDismiss = vi.fn();
      const { dragOffset, isDragging, handleTouchStart, handleTouchMove } = useDrag(mockDismiss, 50);

      const startEvent = { touches: [{ clientX: 100 }] };
      handleTouchStart(startEvent);

      const moveEvent = { touches: [{ clientX: 150 }] };
      handleTouchMove(moveEvent);

      expect(dragOffset.value).toBe(50); // 150 - 100
      expect(isDragging.value).toBe(true);
    });

    it('tracks increasing drag offset', () => {
      const mockDismiss = vi.fn();
      const { dragOffset, handleTouchStart, handleTouchMove } = useDrag(mockDismiss, 50);

      handleTouchStart({ touches: [{ clientX: 0 }] });

      handleTouchMove({ touches: [{ clientX: 20 }] });
      expect(dragOffset.value).toBe(20);

      handleTouchMove({ touches: [{ clientX: 50 }] });
      expect(dragOffset.value).toBe(50);

      handleTouchMove({ touches: [{ clientX: 80 }] });
      expect(dragOffset.value).toBe(80);
    });

    it('ignores negative drag (leftward movement)', () => {
      const mockDismiss = vi.fn();
      const { dragOffset, handleTouchStart, handleTouchMove } = useDrag(mockDismiss, 50);

      handleTouchStart({ touches: [{ clientX: 100 }] });

      handleTouchMove({ touches: [{ clientX: 50 }] }); // Move left
      expect(dragOffset.value).toBe(0); // Should not track negative offset
    });

    it('ignores touch move when not dragging', () => {
      const mockDismiss = vi.fn();
      const { dragOffset, handleTouchMove } = useDrag(mockDismiss, 50);

      const event = { touches: [{ clientX: 50 }] };
      handleTouchMove(event);

      expect(dragOffset.value).toBe(0); // Should not update if not dragging
    });
  });

  describe('Threshold Detection', () => {
    it('calls onDismiss when drag exceeds threshold', () => {
      const mockDismiss = vi.fn();
      const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss, 70);

      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 80 }] }); // 80 > 70 threshold
      handleTouchEnd({});

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not call onDismiss when drag below threshold', () => {
      const mockDismiss = vi.fn();
      const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss, 70);

      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 50 }] }); // 50 < 70 threshold
      handleTouchEnd({});

      expect(mockDismiss).not.toHaveBeenCalled();
    });

    it('calls onDismiss when drag equals threshold exactly', () => {
      const mockDismiss = vi.fn();
      const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss, 70);

      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 70 }] }); // 70 === 70 threshold
      handleTouchEnd({});

      // Note: dragOffset > threshold, so 70 > 70 is false, should NOT call
      expect(mockDismiss).not.toHaveBeenCalled();
    });

    it('calls onDismiss when drag exceeds threshold by 1px', () => {
      const mockDismiss = vi.fn();
      const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss, 70);

      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 71 }] }); // 71 > 70
      handleTouchEnd({});

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('respects custom threshold', () => {
      const mockDismiss = vi.fn();
      const customThreshold = 100;
      const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss, customThreshold);

      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 80 }] }); // Below custom threshold
      handleTouchEnd({});

      expect(mockDismiss).not.toHaveBeenCalled();

      // Reset and try with sufficient drag
      const {
        handleTouchStart: start2,
        handleTouchMove: move2,
        handleTouchEnd: end2,
      } = useDrag(mockDismiss, customThreshold);
      start2({ touches: [{ clientX: 0 }] });
      move2({ touches: [{ clientX: 101 }] }); // Above custom threshold
      end2({});

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset and Snap Back', () => {
    it('resets offset to zero when threshold not met', () => {
      const mockDismiss = vi.fn();
      const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss, 70);

      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 50 }] });
      expect(dragOffset.value).toBe(50);

      handleTouchEnd({});

      expect(dragOffset.value).toBe(0); // Snapped back
    });

    it('does not reset offset when threshold met (caller handles removal)', () => {
      const mockDismiss = vi.fn();
      const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss, 70);

      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 80 }] });

      handleTouchEnd({});

      // When onDismiss is called, the component typically removes the element
      // So the dragOffset state doesn't matter, but we can check it wasn't reset
      expect(dragOffset.value).toBe(80);
      expect(mockDismiss).toHaveBeenCalled();
    });

    it('sets isDragging to false on touch end', () => {
      const mockDismiss = vi.fn();
      const { isDragging, handleTouchStart, handleTouchEnd } = useDrag(mockDismiss, 70);

      handleTouchStart({ touches: [{ clientX: 0 }] });
      expect(isDragging.value).toBe(true);

      handleTouchEnd({});
      expect(isDragging.value).toBe(false);
    });

    it('allows multiple drag sequences', () => {
      const mockDismiss = vi.fn();
      const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss, 70);

      // First drag (below threshold)
      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 30 }] });
      handleTouchEnd({});
      expect(dragOffset.value).toBe(0); // Reset
      expect(mockDismiss).not.toHaveBeenCalled();

      // Second drag (above threshold)
      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 80 }] });
      handleTouchEnd({});
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real-world Scenarios', () => {
    it('handles typical swipe right gesture (DetailsDrawer use case)', () => {
      const onDismiss = vi.fn();
      const threshold = 70;
      const { dragOffset, isDragging, handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(
        onDismiss,
        threshold
      );

      // User touches drawer at x=50
      handleTouchStart({ touches: [{ clientX: 50 }] });
      expect(isDragging.value).toBe(true);

      // Moves to x=80 (30px drag, below threshold)
      handleTouchMove({ touches: [{ clientX: 80 }] });
      expect(dragOffset.value).toBe(30);

      // Continues to x=120 (70px drag, at threshold)
      handleTouchMove({ touches: [{ clientX: 120 }] });
      expect(dragOffset.value).toBe(70);

      // Completes at x=150 (100px drag, exceeds threshold)
      handleTouchMove({ touches: [{ clientX: 150 }] });
      expect(dragOffset.value).toBe(100);

      handleTouchEnd({});

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('handles partial swipe that snaps back', () => {
      const onDismiss = vi.fn();
      const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(onDismiss, 70);

      // User starts swipe
      handleTouchStart({ touches: [{ clientX: 0 }] });

      // Drags partway: 50px
      handleTouchMove({ touches: [{ clientX: 50 }] });
      expect(dragOffset.value).toBe(50);

      // User releases (below threshold)
      handleTouchEnd({});

      // Should snap back to 0
      expect(dragOffset.value).toBe(0);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('handles accidental leftward drag', () => {
      const onDismiss = vi.fn();
      const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(onDismiss, 70);

      // User starts at x=100
      handleTouchStart({ touches: [{ clientX: 100 }] });

      // Accidentally moves left to x=80 (negative offset)
      handleTouchMove({ touches: [{ clientX: 80 }] });
      expect(dragOffset.value).toBe(0); // Ignored

      // Corrects and moves right to x=120 (20px right)
      handleTouchMove({ touches: [{ clientX: 120 }] });
      expect(dragOffset.value).toBe(20); // Now tracks from original start

      handleTouchEnd({});
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Event Handler Return Values', () => {
    it('returns correct handler functions', () => {
      const mockDismiss = vi.fn();
      const handlers = useDrag(mockDismiss, 70);

      expect(typeof handlers.handleTouchStart).toBe('function');
      expect(typeof handlers.handleTouchMove).toBe('function');
      expect(typeof handlers.handleTouchEnd).toBe('function');
    });

    it('handlers do not return values', () => {
      const mockDismiss = vi.fn();
      const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss, 70);

      const startResult = handleTouchStart({ touches: [{ clientX: 0 }] });
      const moveResult = handleTouchMove({ touches: [{ clientX: 50 }] });
      const endResult = handleTouchEnd({});

      expect(startResult).toBeUndefined();
      expect(moveResult).toBeUndefined();
      expect(endResult).toBeUndefined();
    });
  });

  describe('Default Threshold', () => {
    it('uses 50px as default threshold when not specified', () => {
      const mockDismiss = vi.fn();
      const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss); // No threshold arg

      handleTouchStart({ touches: [{ clientX: 0 }] });

      // At 51px (exceeds default 50)
      handleTouchMove({ touches: [{ clientX: 51 }] });
      handleTouchEnd({});

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('uses 50px default: 50px does not trigger', () => {
      const mockDismiss = vi.fn();
      const { handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(mockDismiss);

      handleTouchStart({ touches: [{ clientX: 0 }] });
      handleTouchMove({ touches: [{ clientX: 50 }] }); // Exactly 50, not > 50
      handleTouchEnd({});

      expect(mockDismiss).not.toHaveBeenCalled();
    });
  });
});
