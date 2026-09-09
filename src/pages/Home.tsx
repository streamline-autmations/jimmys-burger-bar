import React from 'react';
import { sections } from '../core/tenant';
import { Section } from '../brand/sections';

/**
 * The home page is composed, not written.
 *
 * It used to be ~500 lines of nine inline sections with every heading, eyebrow
 * and alt string as a literal, which meant a new restaurant could not drop
 * Jimmy's monthly car meet without editing this file. The order and content now
 * come from the tenant; this renders them.
 */
export const Home: React.FC = () => (
  <div className="flex flex-col w-full">
    {sections.map((spec, index) => (
      <Section key={`${spec.type}-${index}`} spec={spec} />
    ))}
  </div>
);
