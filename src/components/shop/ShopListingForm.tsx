'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Save } from 'lucide-react';
import { FormCard, FormSection, FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, type SelectOption } from '@/components/ui/Select';
import { saveListing } from '@/app/(marketing)/shop/selling/actions';

export interface ShopListingFormInitial {
  listingId?: string;
  title: string;
  description: string;
  categoryId: string;
  condition: string;
  priceBdt: string;
  quantity: string;
  location: string;
}

interface Props {
  initial: ShopListingFormInitial;
  categories: SelectOption[];
  minPrice: number;
  maxPrice: number;
  mode: 'create' | 'edit';
}

const CONDITION_OPTIONS: SelectOption[] = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'FOR_PARTS', label: 'For parts' },
];

export default function ShopListingForm({
  initial,
  categories,
  minPrice,
  maxPrice,
  mode,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    // Image pipeline lands in Phase 5 — for now sellers go text-only.
    formData.set('imagesJson', JSON.stringify([]));
    if (initial.listingId) {
      formData.set('listingId', initial.listingId);
    }
    const res = await saveListing(formData);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.listingId) {
      router.push(`/shop/listing/${res.listingId}`);
    } else {
      router.push('/shop/selling');
    }
    router.refresh();
  }

  return (
    <FormCard
      surface='embedded'
      icon={<Tag size={28} />}
      title={mode === 'edit' ? 'Edit listing' : 'New listing'}
      subtitle={`Price range ${minPrice}–${maxPrice} BDT. Items appear immediately.`}
    >
      {error && <FormAlert>{error}</FormAlert>}
      <form action={handleSubmit} className='flex flex-col gap-5'>
        <FormSection label='Item details' icon={<Tag size={14} />}>
          <Input
            containerClassName={fieldClass}
            name='title'
            label='Title'
            placeholder='e.g. CSE115 textbook, hardly used'
            defaultValue={initial.title}
            maxLength={120}
            required
          />
          <Textarea
            containerClassName={fieldClass}
            name='description'
            label='Description'
            placeholder="Describe the item's condition, edition, defects, what's included."
            defaultValue={initial.description}
            maxLength={4000}
            required
            rows={6}
          />
          <Select
            label='Category'
            name='categoryId'
            options={categories}
            defaultValue={initial.categoryId || undefined}
            placeholderOption='Select a category'
            required
          />
          <Select
            label='Condition'
            name='condition'
            options={CONDITION_OPTIONS}
            defaultValue={initial.condition || 'GOOD'}
            required
          />
        </FormSection>

        <FormSection label='Pricing & inventory'>
          <Input
            containerClassName={fieldClass}
            name='priceBdt'
            type='number'
            step='any'
            min={String(minPrice)}
            max={String(maxPrice)}
            label='Price (BDT)'
            suffix='BDT'
            defaultValue={initial.priceBdt}
            required
            hint={`Min ${minPrice} · Max ${maxPrice} BDT`}
          />
          <Input
            containerClassName={fieldClass}
            name='quantity'
            type='number'
            step='1'
            min='1'
            label='Quantity'
            defaultValue={initial.quantity || '1'}
            required
          />
        </FormSection>

        <FormSection label='Meet-up location (optional)'>
          <Input
            containerClassName={fieldClass}
            name='location'
            label='Location'
            placeholder='e.g. NSU Campus, Library, Bashundhara'
            defaultValue={initial.location}
            maxLength={120}
            hint='Helps buyers plan a meet-up. Keep it general — never share your dorm/room.'
          />
        </FormSection>

        <p className='text-xs text-muted'>
          Image uploads land in the next phase. For now your listing will show a
          placeholder tile.
        </p>

        <FormSubmit
          loading={loading}
          loadingText='Saving...'
          icon={<Save size={18} />}
        >
          {mode === 'edit' ? 'Save changes' : 'Publish listing'}
        </FormSubmit>
      </form>
    </FormCard>
  );
}
