import * as React from "react";
import styles from "./BlockLoader.module.css";

const SEQUENCES = [
  ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
  ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  ["▖", "▘", "▝", "▗"],
  ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▁"],
  ["▉", "▊", "▋", "▌", "▍", "▎", "▏", "▎", "▍", "▌", "▋", "▊", "▉"],
  ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
  ["┤", "┘", "┴", "└", "├", "┌", "┬", "┐"],
  ["◢", "◣", "◤", "◥"],
  ["◰", "◳", "◲", "◱"],
  ["◴", "◷", "◶", "◵"],
  ["◐", "◓", "◑", "◒"],
];

interface BlockLoaderProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  mode?: number;
}

const BlockLoader: React.FC<BlockLoaderProps> = ({ mode = 0 }) => {
  const sequence = SEQUENCES[mode];
  const indexLength = sequence?.length ?? 0;
  const [index, setIndex] = React.useState(0);
  const intervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!indexLength) return;
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

  if (!sequence) {
    return <span className={styles.block}>�</span>;
  }

  return <span className={styles.root}>{sequence[index]}</span>;
};

export default BlockLoader;
