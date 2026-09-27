import { Prism } from 'prism-react-renderer';

// prismjs language files register themselves on a global `Prism`. Point that at
// prism-react-renderer's instance so the extra grammars are available to <Highlight>.
(globalThis as { Prism?: typeof Prism }).Prism = Prism;
