import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { GeneratedProposal } from 'shared';

interface PDFOptions {
  logoPath?: string;
  brandColor?: string;
  outputPath: string;
}

export function generateProposalPDF(proposal: GeneratedProposal, options: PDFOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      info: {
        Title: proposal.title,
        Author: proposal.contactSection.companyName,
        Subject: 'Коммерческое предложение',
      },
    });

    const color = options.brandColor || '#2563EB';
    const stream = fs.createWriteStream(options.outputPath);

    doc.pipe(stream);

    // ===== Helper functions =====
    const addPageNumber = () => {
      doc.save();
      doc.fontSize(8).fillColor('#999999');
      doc.text(
        `Страница ${doc.bufferedPageRange().count}`,
        50,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 100 }
      );
      doc.restore();
    };

    // ===== Cover Page =====
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8fafc');
    doc.rect(0, 0, doc.page.width, 200).fill(color);
    doc.fill('#ffffff').fontSize(36).font('Helvetica-Bold');
    doc.text(proposal.coverPage.title, 50, 80, { width: 495 });
    doc.fontSize(16).font('Helvetica');
    doc.text(proposal.coverPage.subtitle, 50, 130, { width: 495 });
    doc.fill(color).fontSize(10);
    doc.text(`${proposal.coverPage.companyName} → ${proposal.coverPage.clientName}`, 50, 170);

    if (options.logoPath && fs.existsSync(options.logoPath)) {
      doc.image(options.logoPath, doc.page.width - 150, 50, { width: 100 });
    }

    doc.fill('#333333').fontSize(11).font('Helvetica');
    doc.text(`Дата: ${proposal.coverPage.date}`, 50, 240);

    const coverBottom = doc.page.height - 60;
    doc.fontSize(8).fillColor('#999999');
    doc.text(proposal.contactSection.companyName, 50, coverBottom);
    doc.text(proposal.contactSection.contactInfo, 50, coverBottom + 12);
    doc.text(proposal.contactSection.phone || '', 50, coverBottom + 24);

    doc.addPage();

    // ===== Greeting =====
    doc.fontSize(22).fillColor(color).font('Helvetica-Bold').text('Уважаемый клиент!', 50, 50);
    doc.fontSize(11).fillColor('#444444').font('Helvetica');
    doc.text(proposal.greeting, 50, 90, { width: 495, align: 'left', lineGap: 6 });

    // ===== Problem Analysis =====
    doc.addPage();
    doc.fontSize(18).fillColor(color).font('Helvetica-Bold').text('Анализ потребностей', 50, 50);
    doc.moveTo(50, 75).lineTo(200, 75).strokeColor(color).lineWidth(2).stroke();

    doc.fontSize(11).fillColor('#444444').font('Helvetica');
    doc.text(proposal.problemAnalysis, 50, 90, { width: 495, align: 'left', lineGap: 6 });

    // ===== Solution =====
    doc.addPage();
    doc.fontSize(18).fillColor(color).font('Helvetica-Bold').text('Наше решение', 50, 50);
    doc.moveTo(50, 75).lineTo(200, 75).strokeColor(color).lineWidth(2).stroke();

    doc.fontSize(11).fillColor('#444444').font('Helvetica');
    doc.text(proposal.solution, 50, 90, { width: 495, align: 'left', lineGap: 6 });

    // ===== Services =====
    doc.addPage();
    doc.fontSize(18).fillColor(color).font('Helvetica-Bold').text('Услуги', 50, 50);
    doc.moveTo(50, 75).lineTo(200, 75).strokeColor(color).lineWidth(2).stroke();

    let yPos = 90;
    proposal.servicesOffered.forEach((service) => {
      doc.roundedRect(50, yPos, 495, 60, 8).fillAndStroke('#f8fafc', color);
      doc.fill('#111111').fontSize(13).font('Helvetica-Bold').text(service.name, 65, yPos + 10);
      doc.fillColor('#555555').fontSize(10).font('Helvetica');
      doc.text(service.description, 65, yPos + 30, { width: 400 });
      if (service.price) {
        doc.fillColor(color).fontSize(12).font('Helvetica-Bold').text(service.price, 450, yPos + 10, { width: 80, align: 'right' });
      }
      yPos += 75;
    });

    // ===== Pricing =====
    doc.addPage();
    doc.fontSize(18).fillColor(color).font('Helvetica-Bold').text('Стоимость', 50, 50);
    doc.moveTo(50, 75).lineTo(200, 75).strokeColor(color).lineWidth(2).stroke();

    // Pricing table
    const tableTop = 95;
    const col1 = 50;
    const col2 = 350;
    const col3 = 450;

    doc.fontSize(10).fillColor('#ffffff');
    doc.rect(col1, tableTop, 495, 25).fill(color);
    doc.fill('#ffffff').font('Helvetica-Bold');
    doc.text('Услуга', col1 + 10, tableTop + 7);
    doc.text('Описание', col2 + 10, tableTop + 7);
    doc.text('Цена', col3 + 10, tableTop + 7);

    let tableY = tableTop + 25;
    proposal.pricing.items.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(col1, tableY, 495, 25).fill(bgColor);
      doc.fillColor('#333333').font('Helvetica').fontSize(9);
      doc.text(item.name, col1 + 10, tableY + 7, { width: 280 });
      doc.text(item.description, col2 + 10, tableY + 7, { width: 80 });
      doc.text(item.price || '', col3 + 10, tableY + 7, { width: 50, align: 'right' });
      tableY += 25;
    });

    doc.rect(col1, tableY, 495, 25).fill(color);
    doc.fill('#ffffff').font('Helvetica-Bold').fontSize(11);
    doc.text('Итого:', col1 + 10, tableY + 7);
    doc.text(proposal.pricing.total, col3 + 10, tableY + 7, { width: 50, align: 'right' });

    if (proposal.pricing.notes) {
      doc.fillColor('#666666').font('Helvetica').fontSize(9);
      doc.text(proposal.pricing.notes, 50, tableY + 40, { width: 495 });
    }

    // ===== Timeline =====
    doc.addPage();
    doc.fontSize(18).fillColor(color).font('Helvetica-Bold').text('Этапы работы', 50, 50);
    doc.moveTo(50, 75).lineTo(200, 75).strokeColor(color).lineWidth(2).stroke();

    let timelineY = 95;
    doc.fillColor('#111111').fontSize(12).font('Helvetica-Bold');
    doc.text(`Общий срок: ${proposal.timeline.totalDuration}`, 50, timelineY);
    timelineY += 30;

    proposal.timeline.phases.forEach((phase, index) => {
      doc.roundedRect(50, timelineY, 495, 50, 6).fillAndStroke('#f0f7ff', '#d0e0ff');
      doc.fillColor(color).fontSize(24).font('Helvetica-Bold').text(`${index + 1}`, 65, timelineY + 10);
      doc.fillColor('#111111').fontSize(12).font('Helvetica-Bold').text(phase.name, 95, timelineY + 8);
      doc.fillColor('#666666').fontSize(9).font('Helvetica').text(phase.duration, 95, timelineY + 25);
      doc.fillColor('#444444').fontSize(10).font('Helvetica').text(phase.description, 200, timelineY + 8, { width: 330 });
      timelineY += 65;
    });

    // ===== Advantages =====
    doc.addPage();
    doc.fontSize(18).fillColor(color).font('Helvetica-Bold').text('Преимущества сотрудничества', 50, 50);
    doc.moveTo(50, 75).lineTo(250, 75).strokeColor(color).lineWidth(2).stroke();

    let advY = 95;
    proposal.advantages.forEach((adv, index) => {
      doc.circle(60, advY + 5, 4).fill(color);
      doc.fontSize(11).fillColor('#444444').font('Helvetica').text(adv, 75, advY - 3, { width: 470 });
      advY += 25;
    });

    // ===== Case Studies =====
    if (proposal.caseStudies && proposal.caseStudies.length > 0) {
      doc.addPage();
      doc.fontSize(18).fillColor(color).font('Helvetica-Bold').text('Кейсы', 50, 50);
      doc.moveTo(50, 75).lineTo(200, 75).strokeColor(color).lineWidth(2).stroke();

      let caseY = 95;
      proposal.caseStudies.forEach((cs) => {
        doc.rect(50, caseY, 495, 80).fill('#ffffff').strokeColor('#e0e0e0').lineWidth(1).stroke();
        doc.fillColor(color).fontSize(12).font('Helvetica-Bold').text(cs.title, 65, caseY + 10);
        doc.fillColor('#555555').fontSize(10).font('Helvetica').text(cs.description, 65, caseY + 30, { width: 350 });
        doc.fillColor('#059669').fontSize(10).font('Helvetica-Bold').text(`Результат: ${cs.result}`, 65, caseY + 55);
        caseY += 95;
      });
    }

    // ===== Conclusion & Contacts =====
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8fafc');
    doc.fontSize(18).fillColor(color).font('Helvetica-Bold').text('Заключение', 50, 50);
    doc.moveTo(50, 75).lineTo(200, 75).strokeColor(color).lineWidth(2).stroke();

    doc.fontSize(11).fillColor('#444444').font('Helvetica');
    doc.text(proposal.conclusion, 50, 95, { width: 495, align: 'left', lineGap: 6 });

    const contactY = doc.y + 50;
    doc.rect(50, contactY, 495, 120).fillAndStroke('#ffffff', color);

    doc.fillColor(color).fontSize(16).font('Helvetica-Bold').text(proposal.contactSection.companyName, 65, contactY + 15);
    doc.fillColor('#444444').fontSize(10).font('Helvetica');
    doc.text(proposal.contactSection.contactInfo, 65, contactY + 42, { width: 460 });
    if (proposal.contactSection.phone) {
      doc.text(`📞 ${proposal.contactSection.phone}`, 65, contactY + 62);
    }
    if (proposal.contactSection.email) {
      doc.text(`✉️ ${proposal.contactSection.email}`, 65, contactY + 78);
    }
    if (proposal.contactSection.website) {
      doc.fillColor(color).text(`🌐 ${proposal.contactSection.website}`, 65, contactY + 94);
    }

    addPageNumber();

    doc.end();

    stream.on('finish', () => resolve(options.outputPath));
    stream.on('error', reject);
  });
}
