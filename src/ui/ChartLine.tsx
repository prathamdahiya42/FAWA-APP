import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '@/src/theme';
import { FontFamilies } from '@/src/theme/typography';
import { Spacing } from '@/src/theme/spacing';

interface DataPoint {
  xLabel: string;
  value: number;
}

interface ChartLineProps {
  data: DataPoint[];
  targetMin?: number;
  targetMax?: number;
  width?: number;
  height?: number;
  unit?: string;
}

export function ChartLine({
  data,
  targetMin,
  targetMax,
  width = 320,
  height = 160,
  unit = '',
}: ChartLineProps) {
  const colors = useThemeColors();

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={{ color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }}>
          No data recorded yet
        </Text>
      </View>
    );
  }

  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 28;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const allValues = data.map((d) => d.value);
  if (targetMin !== undefined) allValues.push(targetMin);
  if (targetMax !== undefined) allValues.push(targetMax);

  const minVal = Math.min(...allValues) * 0.95;
  const maxVal = Math.max(...allValues) * 1.05;
  const range = maxVal - minVal || 1;

  const getY = (val: number) =>
    paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;

  const getX = (idx: number) =>
    paddingLeft + (data.length > 1 ? (idx / (data.length - 1)) * chartWidth : chartWidth / 2);

  // Line path
  const linePath = data.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.value);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Target band
  const targetTop = targetMax !== undefined ? getY(targetMax) : null;
  const targetBottom = targetMin !== undefined ? getY(targetMin) : null;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Shaded target band */}
        {targetTop !== null && targetBottom !== null && (
          <Rect
            x={paddingLeft}
            y={targetTop}
            width={chartWidth}
            height={Math.max(targetBottom - targetTop, 2)}
            fill={colors.yellow}
            opacity={0.12}
          />
        )}

        {/* Horizontal grid lines */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={paddingLeft + chartWidth}
          y2={paddingTop + chartHeight}
          stroke={colors.line}
          strokeWidth={1}
        />
        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft + chartWidth}
          y2={paddingTop}
          stroke={colors.line}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Data line */}
        <Path d={linePath} fill="none" stroke={colors.green} strokeWidth={2.5} />

        {/* Data points */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.value);
          return (
            <Circle
              key={`dot-${i}`}
              cx={cx}
              cy={cy}
              r={4}
              fill={colors.yellow}
              stroke={colors.bg}
              strokeWidth={1.5}
            />
          );
        })}

        {/* X labels */}
        {data.map((d, i) => (
          <SvgText
            key={`xlabel-${i}`}
            x={getX(i)}
            y={height - 8}
            fill={colors.textMuted}
            fontSize={10}
            fontFamily={FontFamilies.mono}
            textAnchor="middle"
          >
            {d.xLabel}
          </SvgText>
        ))}

        {/* Y bounds */}
        <SvgText
          x={paddingLeft - 6}
          y={paddingTop + 10}
          fill={colors.textMuted}
          fontSize={10}
          fontFamily={FontFamilies.mono}
          textAnchor="end"
        >
          {Math.round(maxVal)}
        </SvgText>
        <SvgText
          x={paddingLeft - 6}
          y={paddingTop + chartHeight}
          fill={colors.textMuted}
          fontSize={10}
          fontFamily={FontFamilies.mono}
          textAnchor="end"
        >
          {Math.round(minVal)}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
