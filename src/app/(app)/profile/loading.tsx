import { HeaderSkeleton, PageSkeleton } from "../_components/skeletons";

// Завантаження профілю: заголовок тієї ж форми, що й зміст.
export default function ProfileLoading() {
  return (
    <PageSkeleton label="Loading profile…">
      <HeaderSkeleton title="w-24" />
    </PageSkeleton>
  );
}
