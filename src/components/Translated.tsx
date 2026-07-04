import { useTranslatedText } from '@/hooks/useTranslatedText';

interface Props {
  text: string | null | undefined;
  as?: 'span' | 'div';
  className?: string;
}

export const Translated: React.FC<Props> = ({ text, as: Tag = 'span', className }) => {
  const translated = useTranslatedText(text);
  return <Tag className={className}>{translated}</Tag>;
};
