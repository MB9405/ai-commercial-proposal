import { PrismaClient, TemplateType } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    name: 'IT Услуги',
    type: TemplateType.IT,
    description: 'Шаблон для IT-компаний, разработчиков ПО, веб-студий',
    structure: {
      sections: ['cover', 'greeting', 'problem', 'solution', 'advantages', 'pricing', 'timeline', 'cases', 'contacts', 'conclusion'],
      style: 'modern-tech',
    },
  },
  {
    name: 'Маркетинг',
    type: TemplateType.MARKETING,
    description: 'Шаблон для маркетинговых агентств и SMM',
    structure: {
      sections: ['cover', 'greeting', 'problem', 'solution', 'advantages', 'pricing', 'timeline', 'cases', 'contacts', 'conclusion'],
      style: 'creative',
    },
  },
  {
    name: 'Дизайн',
    type: TemplateType.DESIGN,
    description: 'Шаблон для дизайн-студий и фрилансеров',
    structure: {
      sections: ['cover', 'greeting', 'problem', 'solution', 'advantages', 'pricing', 'timeline', 'cases', 'contacts', 'conclusion'],
      style: 'minimal',
    },
  },
  {
    name: 'Консалтинг',
    type: TemplateType.CONSULTING,
    description: 'Шаблон для консалтинговых компаний',
    structure: {
      sections: ['cover', 'greeting', 'problem', 'solution', 'advantages', 'pricing', 'timeline', 'cases', 'contacts', 'conclusion'],
      style: 'professional',
    },
  },
  {
    name: 'Строительство',
    type: TemplateType.CONSTRUCTION,
    description: 'Шаблон для строительных компаний',
    structure: {
      sections: ['cover', 'greeting', 'problem', 'solution', 'advantages', 'pricing', 'timeline', 'cases', 'contacts', 'conclusion'],
      style: 'industrial',
    },
  },
  {
    name: 'Закупки',
    type: TemplateType.PROCUREMENT,
    description: 'Шаблон для тендеров и закупок',
    structure: {
      sections: ['cover', 'greeting', 'problem', 'solution', 'advantages', 'pricing', 'timeline', 'cases', 'contacts', 'conclusion'],
      style: 'formal',
    },
  },
  {
    name: 'Образование',
    type: TemplateType.EDUCATION,
    description: 'Шаблон для образовательных центров',
    structure: {
      sections: ['cover', 'greeting', 'problem', 'solution', 'advantages', 'pricing', 'timeline', 'cases', 'contacts', 'conclusion'],
      style: 'academic',
    },
  },
  {
    name: 'Юридические услуги',
    type: TemplateType.LEGAL,
    description: 'Шаблон для юридических фирм',
    structure: {
      sections: ['cover', 'greeting', 'problem', 'solution', 'advantages', 'pricing', 'timeline', 'cases', 'contacts', 'conclusion'],
      style: 'formal-legal',
    },
  },
];

async function main() {
  console.log('Seeding templates...');
  for (const template of templates) {
    await prisma.template.upsert({
      where: { id: template.type },
      update: template,
      create: { id: template.type, ...template },
    });
  }
  console.log('Templates created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
