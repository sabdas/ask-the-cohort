import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export const COURSE_ID = '8b616fb7-59c0-465d-acb7-e6e11b9adbdb'

export type Question = {
  id: string
  name: string
  question_text: string
  upvotes: number
  created_at: string
  course_id: string
}

export type Answer = {
  id: string
  question_id: string
  name: string
  answer_text: string
  created_at: string
}
