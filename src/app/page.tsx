import Link from 'next/link'
import {
  CakeSlice,
  ClipboardList,
  TrendingUp,
  Megaphone,
  ChevronRight,
  Star,
  CheckCircle2,
} from 'lucide-react'

const features = [
  {
    icon: ClipboardList,
    title: 'Gestão de Pedidos',
    description: 'Controle todos os pedidos com status em tempo real, data de entrega e histórico completo.',
  },
  {
    icon: CakeSlice,
    title: 'Controle de Produção',
    description: 'Kanban visual para acompanhar cada etapa: preparo, assar, decorar, embalar e pronto.',
  },
  {
    icon: TrendingUp,
    title: 'Financeiro',
    description: 'Receitas, despesas e relatórios mensais para saber exatamente como está seu negócio.',
  },
  {
    icon: Megaphone,
    title: 'Marketing com IA',
    description: 'Gere cronogramas de conteúdo para Instagram e WhatsApp com inteligência artificial.',
  },
]

const plans = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    period: '/sempre',
    description: 'Para começar a organizar sua doceria.',
    features: ['Até 20 pedidos/mês', 'Controle básico de produção', 'Relatório simplificado'],
    cta: 'Começar grátis',
    href: '/cadastro',
    highlighted: false,
  },
  {
    name: 'Básico',
    price: 'R$ 49',
    period: '/mês',
    description: 'Para docerias em crescimento.',
    features: [
      'Pedidos ilimitados',
      'Produção completa (Kanban)',
      'Financeiro completo',
      '5 cronogramas de marketing/mês',
      'Suporte por e-mail',
    ],
    cta: 'Assinar Básico',
    href: '/cadastro?plano=basico',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: 'R$ 99',
    period: '/mês',
    description: 'Para docerias profissionais.',
    features: [
      'Tudo do Básico',
      'Cronogramas ilimitados com IA',
      'Relatórios avançados',
      'Exportação PDF',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro',
    href: '/cadastro?plano=pro',
    highlighted: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎂</span>
            <span className="font-bold text-xl text-gray-900">Doceria Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-orange-50 py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Star className="w-4 h-4" />
            <span>Feito para confeiteiras brasileiras</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Gerencie sua doceria{' '}
            <span className="text-primary-600">com inteligência</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Controle pedidos, produção, finanças e marketing em um único lugar.
            Deixe a tecnologia trabalhar enquanto você cria.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl hover:bg-primary-700 transition-colors font-semibold text-lg"
            >
              Começar grátis agora
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              href="#planos"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors font-semibold text-lg"
            >
              Ver planos
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Sem cartão de crédito · Plano gratuito para sempre
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um lugar
            </h2>
            <p className="text-lg text-gray-600">
              Do pedido ao post no Instagram, o Doceria Pro cuida de tudo.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="flex flex-col items-start p-6 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
                >
                  <div className="p-3 bg-primary-100 rounded-xl mb-4">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Planos simples e transparentes</h2>
            <p className="text-lg text-gray-600">Comece grátis e escale conforme sua doceria cresce.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl p-8 border ${
                  plan.highlighted
                    ? 'bg-primary-600 text-white border-primary-600 shadow-xl scale-105'
                    : 'bg-white text-gray-900 border-gray-200'
                }`}
              >
                <div className="mb-6">
                  <p className={`text-sm font-medium mb-1 ${plan.highlighted ? 'text-primary-200' : 'text-primary-600'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className={`text-sm mb-1 ${plan.highlighted ? 'text-primary-200' : 'text-gray-500'}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-sm ${plan.highlighted ? 'text-primary-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <CheckCircle2
                        className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? 'text-primary-200' : 'text-primary-600'}`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`text-center py-3 px-6 rounded-xl font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-primary-600 hover:bg-primary-50'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎂</span>
            <span className="font-semibold text-white">Doceria Pro</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Doceria Pro. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacidade" className="hover:text-white transition-colors">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-white transition-colors">
              Termos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
