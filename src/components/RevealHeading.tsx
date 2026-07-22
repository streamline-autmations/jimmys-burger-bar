import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { wordContainer, wordChild, fadeInUp } from '../lib/motion';

// Word-mask heading reveal: each word rises out of its own overflow-hidden
// slot, staggered left to right. Wrapping is safe - the mask is per word, so
// multi-line headings reveal line by line naturally.
//
// The small bottom padding on the mask keeps descenders (g, y, j) from being
// clipped while the word is in motion; the negative margin cancels it out of
// the layout so line-height is unaffected.
const TAGS = { h1: motion.h1, h2: motion.h2, h3: motion.h3 } as const;

export const RevealHeading: React.FC<{
  text: string;
  as?: keyof typeof TAGS;
  className?: string;
}> = ({ text, as = 'h2', className }) => {
  const shouldReduceMotion = useReducedMotion();
  const Tag = TAGS[as];

  if (shouldReduceMotion) {
    return (
      <Tag {...fadeInUp} className={className}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag
      variants={wordContainer}
      initial="initial"
      whileInView="whileInView"
      viewport={{ once: true, amount: 0.5 }}
      className={className}
    >
      {text.split(' ').map((word, i) => (
        <React.Fragment key={`${word}-${i}`}>
          {i > 0 && ' '}
          <span className="inline-block overflow-hidden align-bottom pb-[0.1em] -mb-[0.1em]">
            <motion.span variants={wordChild} className="inline-block">
              {word}
            </motion.span>
          </span>
        </React.Fragment>
      ))}
    </Tag>
  );
};
