'use client'

import { useState } from 'react'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [formData, setFormData] = useState({
    type: 'feedback' as 'feedback' | 'bug' | 'feature',
    email: '',
    subject: '',
    message: '',
    rating: 5
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.message.trim()) {
      alert('メッセージを入力してください')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          onClose()
          setSubmitted(false)
          setFormData({
            type: 'feedback',
            email: '',
            subject: '',
            message: '',
            rating: 5
          })
        }, 2000)
      } else {
        throw new Error('送信に失敗しました')
      }
    } catch (error) {
      console.error('Feedback submission error:', error)
      alert('送信に失敗しました。しばらくしてからもう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg w-full max-w-md m-4 p-8 text-center">
          <div className="text-green-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">送信完了</h3>
          <p className="text-gray-600">
            フィードバックをお送りいただき、ありがとうございます。<br />
            今後の改善に活用させていただきます。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden m-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">フィードバック</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* フィードバックタイプ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              フィードバックの種類 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'feedback' })}
                className={`p-3 rounded-lg border text-sm ${
                  formData.type === 'feedback'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">一般的なご意見</div>
                <div className="text-xs mt-1">感想や使用感など</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'bug' })}
                className={`p-3 rounded-lg border text-sm ${
                  formData.type === 'bug'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">バグ報告</div>
                <div className="text-xs mt-1">不具合や問題など</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'feature' })}
                className={`p-3 rounded-lg border text-sm ${
                  formData.type === 'feature'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">機能要望</div>
                <div className="text-xs mt-1">新機能や改善案など</div>
              </button>
            </div>
          </div>

          {/* 満足度評価（一般的なご意見の場合のみ） */}
          {formData.type === 'feedback' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                満足度評価
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className={`text-2xl ${
                      star <= formData.rating ? 'text-yellow-500' : 'text-gray-300'
                    } hover:text-yellow-500`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-3 text-sm text-gray-600">
                  {formData.rating === 5 && '非常に満足'}
                  {formData.rating === 4 && '満足'}
                  {formData.rating === 3 && '普通'}
                  {formData.rating === 2 && '不満'}
                  {formData.rating === 1 && '非常に不満'}
                </span>
              </div>
            </div>
          )}

          {/* メールアドレス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス（任意）
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="返信を希望される場合はご入力ください"
            />
            <p className="text-xs text-gray-500 mt-1">
              回答が必要な場合のみご入力ください。任意項目です。
            </p>
          </div>

          {/* 件名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              件名（任意）
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="簡潔な件名をご入力ください"
            />
          </div>

          {/* メッセージ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              詳細メッセージ <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder={
                formData.type === 'bug'
                  ? '問題が発生した状況、エラーメッセージ、再現手順などを詳しく教えてください。'
                  : formData.type === 'feature'
                  ? 'どのような機能があると便利か、具体的な使用場面などを教えてください。'
                  : 'ご感想、ご意見、改善点などを自由にお聞かせください。'
              }
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              できるだけ具体的にご記入いただくと、より適切な対応ができます。
            </p>
          </div>

          {/* 送信ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.message.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
              )}
              <span>{isSubmitting ? '送信中...' : '送信する'}</span>
            </button>
          </div>
        </form>

        {/* プライバシー注意書き */}
        <div className="px-6 pb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">プライバシーについて</h4>
            <p className="text-xs text-gray-600">
              お送りいただいた情報は、サービス改善の目的でのみ使用いたします。
              個人情報の取り扱いについては、適切に管理・保護いたします。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}