import React, { useEffect, useRef, useState } from 'react';

/**
 * Bidirectional IntersectionObserver reveal wrapper.
 * Fades and glides elements into view when entering the viewport and
 * smoothly fades them out as they scroll past the top or bottom edge.
 */
export const ScrollReveal = ({
  children,
  className = '',
  delay = 0,
  threshold = 0.08,
  as: Tag = 'div',
}) => {
  const ref = useRef(null);
  const [state, setState] = useState({ visible: true, direction: 'down' });
  const hasObservedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState({ visible: true, direction: 'down' });
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          hasObservedRef.current = true;
          if (entry.isIntersecting) {
            setState({ visible: true, direction: 'in' });
          } else {
            const exitedTop = entry.boundingClientRect.top < 0;
            setState({ visible: false, direction: exitedTop ? 'up' : 'down' });
          }
        });
      },
      {
        threshold,
        rootMargin: '-36px 0px -36px 0px',
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const hiddenOffset = state.direction === 'up' ? '-18px' : '22px';
  const style = {
    opacity: state.visible ? 1 : 0,
    transform: state.visible ? 'translate3d(0, 0, 0) scale(1)' : `translate3d(0, ${hiddenOffset}, 0) scale(0.985)`,
    filter: state.visible ? 'blur(0px)' : 'blur(2px)',
    transitionProperty: 'opacity, transform, filter',
    transitionDuration: '520ms',
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    transitionDelay: state.visible ? `${delay}ms` : '0ms',
    willChange: 'opacity, transform',
  };

  return (
    <Tag ref={ref} style={style} className={`scroll-reveal-node ${className}`}>
      {children}
    </Tag>
  );
};
