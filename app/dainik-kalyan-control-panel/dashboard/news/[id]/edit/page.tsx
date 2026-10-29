import { PageTitle } from '@/components/admin/AdminUi'
import NewsForm from '@/components/admin/NewsForm'
export default async function EditNews({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <><PageTitle title="খবর সম্পাদনা করুন" subtitle="তথ্য বদলে আবার সেভ বা প্রকাশ করুন."/><NewsForm editing articleId={Number(id)}/></> }
