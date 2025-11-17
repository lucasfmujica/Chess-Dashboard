import '../src/index.css';
import '../src/styles/animations.css';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#f8fafc',
        },
        {
          name: 'dark',
          value: '#1e293b',
        },
        {
          name: 'gradient',
          value: 'linear-gradient(to bottom right, #f0f9ff, #dbeafe, #dcfce7)',
        },
      ],
    },
  },
};

export default preview;
