import React from 'react';

export function renderAlternating(
  text: string,
  startWithRed: boolean,
  red: string = '#B45252',
  green: string = '#8AB060'
): React.ReactElement {
  let useRed = startWithRed;
  return (
    <>
      {text.split('').map((ch, idx) => {
        if (ch === ' ') return <span key={idx}> </span>;
        const color = useRed ? red : green;
        useRed = !useRed;
        return (
          <span key={idx} style={{ color }}>
            {ch}
          </span>
        );
      })}
    </>
  );
}


