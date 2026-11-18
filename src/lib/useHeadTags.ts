import { useEffect } from 'react';

export type HeadTag = [tag: 'link' | 'meta', attributes: Record<string, string>];

/**
 * Adds tags to <head> while a shell is mounted. The public site and the staff
 * console each bring their own web app manifest this way, so a browser never
 * sees both: Chrome uses the first manifest link and would install the wrong app.
 */
export function useHeadTags(tags: HeadTag[]): void {
  useEffect(() => {
    const added = tags.map(([tag, attributes]) => {
      const element = document.createElement(tag);
      Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
      return document.head.appendChild(element);
    });
    return () => added.forEach((element) => element.remove());
  }, [tags]);
}
