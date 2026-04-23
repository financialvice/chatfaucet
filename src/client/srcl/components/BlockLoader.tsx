

import styles from './BlockLoader.module.css';

import * as React from 'react';

const SEQUENCES = [
  ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
  ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  ['▖', '▘', '▝', '▗'],
  ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▁'],
  ['▉', '▊', '▋', '▌', '▍', '▎', '▏', '▎', '▍', '▌', '▋', '▊', '▉'],
  ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  ['┤', '┘', '┴', '└', '├', '┌', '┬', '┐'],
  ['◢', '◣', '◤', '◥'],
  ['◰', '◳', '◲', '◱'],
  ['◴', '◷', '◶', '◵'],
  ['◐', '◓', '◑', '◒'],
];

interface BlockLoaderProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  mode?: number;
}

const BlockLoader: React.FC<BlockLoaderProps> = ({ mode = 0 }) => {
  if (!SEQUENCES[mode]) {
    return <span className={styles.block}>�</span>;
  }

  const [index, setIndex] = React.useState(0);
  const intervalRef = React.useRef<number | null>(null);
  const indexLength = SEQUENCES[mode].length;

  React.useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % indexLength);
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [indexLength]);

  return <span className={styles.root}>{SEQUENCES[mode][index]}</span>;
};

export default BlockLoader;
