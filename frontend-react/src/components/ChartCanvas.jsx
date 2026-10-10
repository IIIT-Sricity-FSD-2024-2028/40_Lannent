/**
 * LANNENT — ChartCanvas
 * A <canvas> that draws a Chart.js chart (same Chart.js 4.4.0 the original
 * pages loaded from the CDN). The chart is created when the component mounts
 * and destroyed when it unmounts.
 *
 *   <ChartCanvas id="milestoneChart" config={{ type: 'line', data, options }} />
 */
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function ChartCanvas({ id, config }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const chart = new Chart(canvasRef.current, config);
    return () => chart.destroy();
    // The config is built once per page load, like the original charts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas id={id} ref={canvasRef}></canvas>;
}
