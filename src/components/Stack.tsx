import { motion, useMotionValue, useTransform } from 'framer-motion';
import React, { useEffect, useState } from 'react';

type StackCard = { id: string; content: React.ReactNode };

const StackItem: React.FC<{
  card: StackCard;
  index: number;
  total: number;
  onSendBack: () => void;
}> = ({ card, index, total, onSendBack }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-120, 120], [10, -10]);
  const rotateY = useTransform(x, [-120, 120], [-10, 10]);

  return (
    <motion.div
      className="special-stack-item"
      style={{ x, y, rotateX, rotateY, zIndex: index + 1 }}
      animate={{ rotateZ: (total - index - 1) * 3.5, scale: 0.9 + index * 0.035, y: index * -3 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 70) onSendBack();
        else { x.set(0); y.set(0); }
      }}
      onClick={onSendBack}
    >
      {card.content}
    </motion.div>
  );
};

export const Stack: React.FC<{ cards: StackCard[] }> = ({ cards }) => {
  const [stack, setStack] = useState(cards);

  useEffect(() => setStack(cards), [cards]);
  const sendBack = (id: string) => setStack((current) => {
    const card = current.find((item) => item.id === id);
    return card ? [card, ...current.filter((item) => item.id !== id)] : current;
  });

  return (
    <div className="special-stack" aria-label="Friday specials. Swipe or tap a card to browse.">
      {stack.map((card, index) => (
        <StackItem key={card.id} card={card} index={index} total={stack.length} onSendBack={() => sendBack(card.id)} />
      ))}
    </div>
  );
};
