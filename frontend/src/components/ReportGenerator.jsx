import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { FileText, Loader2 } from 'lucide-react';

// Company logo as base64 (will be loaded dynamically)
let companyLogoBase64 = null;

// Load logo on component mount
const loadLogo = async () => {
  if (companyLogoBase64) return companyLogoBase64;
  try {
    const response = await fetch('/company_logo.jpg');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        companyLogoBase64 = reader.result;
        resolve(companyLogoBase64);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not load company logo:', e);
    return null;
  }
};

// Severity Level Colors
const SEVERITY_COLORS = {
  A: { bg: [16, 185, 129], text: 'Normal' },      // Green
  B: { bg: [6, 182, 212], text: 'Satisfactory' }, // Cyan/Blue
  C: { bg: [245, 158, 11], text: 'Alert' },       // Orange/Yellow
  D: { bg: [239, 68, 68], text: 'Unacceptable' }  // Red
};

const ReportGenerator = ({ machine, onGenerateStart, onGenerateEnd }) => {
  const [loading, setLoading] = useState(false);

  const getStatusSeverity = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'normal') return 'A';
    if (s === 'satisfactory') return 'B';
    if (s === 'alert') return 'C';
    if (s === 'unacceptable' || s === 'unsatisfactory') return 'D';
    return 'A';
  };

  const generatePDFReport = async () => {
    if (!machine) return;
    
    setLoading(true);
    if (onGenerateStart) onGenerateStart();

    try {
      // Load logo
      const logo = await loadLogo();
      
      // Create PDF (A4 size)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      
      // ==================== PAGE 1: Severity Levels Reference ====================
      let yPos = margin;

      // Header
      pdf.setFillColor(30, 41, 59); // Dark blue header
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      // AAMS Logo text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AAMS', margin, 16);
      
      // Company logo on right
      if (logo) {
        try {
          pdf.addImage(logo, 'JPEG', pageWidth - margin - 30, 3, 28, 19);
        } catch (e) {
          console.warn('Failed to add logo to PDF:', e);
        }
      }
      
      yPos = 35;
      
      // Title
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('VIBRATION ANALYSIS REPORT', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      
      // Severity Levels Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Severity Levels', margin, yPos);
      
      yPos += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const severityDesc = 'A Severity level is assigned to each machine based on result of analysis. The severity levels are ranked as follows:';
      pdf.text(severityDesc, margin, yPos);
      
      yPos += 12;
      
      // Severity Level Boxes
      const severityLevels = [
        { code: 'A', level: 1, title: 'Severity level 1:', desc: 'Overall vibration value is within the acceptable range. This level is considered to be normal. No Maintenance action is required.', color: [16, 185, 129] },
        { code: 'B', level: 2, title: 'Severity level 2:', desc: 'This level is considered as satisfactory. Maintenance action may not be necessary. Equipment can be kept under continues operation.', color: [6, 182, 212] },
        { code: 'C', level: 3, title: 'Severity level 3:', desc: "This level is considered 'Unsatisfactory', there has been an increase in the vibration and indicates problem in the machine. Maintenance action can be taken during equipment availability / Planned shutdown.", color: [245, 158, 11] },
        { code: 'D', level: 4, title: 'Severity level 4:', desc: "This level is considered 'Unacceptable', There has been predominant increases in vibration trend and indicates problem in the equipment. Required immediate Maintenance action.", color: [239, 68, 68] }
      ];
      
      severityLevels.forEach((level, index) => {
        const boxHeight = 22;
        
        // Color code box
        pdf.setFillColor(...level.color);
        pdf.rect(margin, yPos, 12, boxHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(level.code, margin + 6, yPos + 13, { align: 'center' });
        
        // Description box
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin + 12, yPos, contentWidth - 12, boxHeight, 'F');
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(level.title, margin + 16, yPos + 8);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const descLines = pdf.splitTextToSize(level.desc, contentWidth - 25);
        pdf.text(descLines, margin + 16, yPos + 14);
        
        yPos += boxHeight + 4;
      });
      
      yPos += 10;
      
      // Velocity Threshold Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text('Velocity Threshold Values (ISO 10816-3)', margin, yPos);
      
      yPos += 8;
      
      // Draw simplified ISO 10816-3 chart
      const chartX = margin;
      const chartY = yPos;
      const chartWidth = contentWidth;
      const chartHeight = 70;
      const cellWidth = chartWidth / 8;
      const cellHeight = chartHeight / 8;
      
      // Velocity levels (mm/s rms)
      const velocityLevels = [11, 7.1, 4.5, 3.5, 2.8, 2.3, 1.4, 0.71];
      const colors = {
        green: [16, 185, 129],
        yellow: [245, 158, 11],
        orange: [251, 146, 60],
        red: [239, 68, 68]
      };
      
      // Group configurations (simplified)
      const groups = [
        { name: 'Group 4', thresholds: [1.4, 2.8, 4.5] },
        { name: 'Group 3', thresholds: [2.3, 4.5, 7.1] },
        { name: 'Group 2', thresholds: [2.8, 4.5, 7.1] },
        { name: 'Group 1', thresholds: [3.5, 7.1, 11] }
      ];
      
      // Draw chart cells
      for (let g = 0; g < 4; g++) {
        const group = groups[g];
        for (let row = 0; row < velocityLevels.length; row++) {
          const vel = velocityLevels[row];
          let color;
          if (vel <= group.thresholds[0]) color = colors.green;
          else if (vel <= group.thresholds[1]) color = colors.yellow;
          else if (vel <= group.thresholds[2]) color = colors.orange;
          else color = colors.red;
          
          // Rigid and Flexible columns
          for (let col = 0; col < 2; col++) {
            pdf.setFillColor(...color);
            pdf.rect(chartX + (g * 2 + col) * cellWidth, chartY + row * cellHeight, cellWidth, cellHeight, 'F');
          }
        }
      }
      
      // Draw grid lines
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.5);
      for (let i = 0; i <= 8; i++) {
        pdf.line(chartX, chartY + i * cellHeight, chartX + chartWidth, chartY + i * cellHeight);
        pdf.line(chartX + i * cellWidth, chartY, chartX + i * cellWidth, chartY + chartHeight);
      }
      
      // Velocity labels on right
      pdf.setFontSize(7);
      pdf.setTextColor(30, 41, 59);
      velocityLevels.forEach((vel, i) => {
        pdf.text(vel.toString(), chartX + chartWidth + 3, chartY + i * cellHeight + cellHeight / 2 + 1);
      });
      pdf.text('mm/s', chartX + chartWidth + 3, chartY + chartHeight + 6);
      
      // Group labels at bottom
      yPos = chartY + chartHeight + 5;
      pdf.setFontSize(7);
      groups.forEach((group, i) => {
        pdf.text(group.name, chartX + (i * 2 + 1) * cellWidth, yPos + 4, { align: 'center' });
      });
      
      yPos += 15;
      
      // Footer note
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      const footerNote = 'Based on ISO standard 10816-3:2009/amd1:2017, Vibration severity is classified into level 1, level 2, level 3 and level 4. It is general guidelines for the acceptable vibration will be set for each machine mainly based on comparative method or by trending over by the period of time as the operating parameters and condition are different for different machines.';
      const footerLines = pdf.splitTextToSize(footerNote, contentWidth);
      pdf.text(footerLines, margin, yPos);
      
      // Page footer
      pdf.setTextColor(79, 70, 229);
      pdf.text('http://app.aams.io', margin, pageHeight - 10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Page: 1', pageWidth - margin, pageHeight - 10, { align: 'right' });
      
      // ==================== PAGE 2: Machine Details ====================
      pdf.addPage();
      yPos = margin;
      
      // Header
      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AAMS', margin, 16);
      
      // Machine name in center
      pdf.setFontSize(12);
      pdf.text(machine.machineName || machine.name || 'Machine Report', pageWidth / 2, 16, { align: 'center' });
      
      // Company logo
      if (logo) {
        try {
          pdf.addImage(logo, 'JPEG', pageWidth - margin - 30, 3, 28, 19);
        } catch (e) {}
      }
      
      yPos = 32;
      
      // Status and Date row
      const severity = getStatusSeverity(machine.status);
      const statusColor = SEVERITY_COLORS[severity];
      
      pdf.setFillColor(...statusColor.bg);
      pdf.roundedRect(margin, yPos, 80, 10, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Status: ${(machine.status || 'Normal').toUpperCase()}`, margin + 5, yPos + 7);
      
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, yPos + 7, { align: 'right' });
      
      yPos += 18;
      
      // Area Name
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Area Name: ${machine.areaId || 'N/A'}`, margin, yPos);
      
      yPos += 12;
      
      // Machine Details Grid
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, yPos, contentWidth, 40, 'F');
      
      const details = [
        { label: 'Machine Code', value: machine.machineId || machine.id || 'N/A' },
        { label: 'Machine Name', value: machine.machineName || machine.name || 'N/A' },
        { label: 'Customer ID', value: machine.customerId || 'N/A' },
        { label: 'Type', value: machine.type || 'OFFLINE' },
        { label: 'Area ID', value: machine.areaId || 'N/A' },
        { label: 'Subarea ID', value: machine.subareaId || 'N/A' }
      ];
      
      const colWidth = contentWidth / 2;
      details.forEach((detail, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = margin + col * colWidth + 5;
        const y = yPos + 10 + row * 12;
        
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(detail.label + ':', x, y);
        
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'bold');
        pdf.text(detail.value, x + 35, y);
      });
      
      yPos += 50;
      
      // Observation Box
      pdf.setFillColor(240, 253, 244); // Light green
      pdf.rect(margin, yPos, contentWidth, 45, 'F');
      pdf.setDrawColor(16, 185, 129);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPos, contentWidth, 45, 'S');
      
      pdf.setTextColor(16, 185, 129);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Observation', margin + 5, yPos + 8);
      
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      const statusText = severity === 'D' ? 'CRITICAL' : severity === 'C' ? 'ALERT' : 'NORMAL';
      const observations = [
        `• The overall vibration amplitude of the motor bearings are within ${statusText} zone.`,
        `• Current machine status: ${(machine.status || 'Normal').toUpperCase()}`,
        `• Machine type: ${machine.type || 'OFFLINE'}`,
        `• Data updated: ${machine.date || new Date().toLocaleDateString()}`
      ];
      
      observations.forEach((obs, i) => {
        pdf.text(obs, margin + 5, yPos + 18 + i * 7);
      });
      
      yPos += 52;
      
      // Recommendation Box
      const recColor = severity === 'D' ? [254, 242, 242] : severity === 'C' ? [255, 251, 235] : [240, 253, 244];
      const recBorderColor = severity === 'D' ? [239, 68, 68] : severity === 'C' ? [245, 158, 11] : [16, 185, 129];
      
      pdf.setFillColor(...recColor);
      pdf.rect(margin, yPos, contentWidth, 50, 'F');
      pdf.setDrawColor(...recBorderColor);
      pdf.rect(margin, yPos, contentWidth, 50, 'S');
      
      pdf.setTextColor(...recBorderColor);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Recommendation', margin + 5, yPos + 8);
      
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      let recommendations = [];
      if (severity === 'A') {
        recommendations = [
          '• Continue regular maintenance schedule.',
          '• No immediate action required.',
          '• Equipment can be kept under continuous operation.'
        ];
      } else if (severity === 'B') {
        recommendations = [
          '• Monitor for any changes in performance.',
          '• Schedule routine inspection within 30 days.',
          '• Equipment can be kept under continuous operation.'
        ];
      } else if (severity === 'C') {
        recommendations = [
          '• Schedule inspection within 7 days.',
          '• Check for unusual vibrations or sounds.',
          '• Maintenance action can be taken during equipment availability.',
          '• Review recent maintenance history.'
        ];
      } else {
        recommendations = [
          '• IMMEDIATE inspection required.',
          '• Consider taking machine offline.',
          '• Contact maintenance team urgently.',
          '• Required immediate Maintenance action.',
          '• Document all findings.'
        ];
      }
      
      recommendations.forEach((rec, i) => {
        pdf.text(rec, margin + 5, yPos + 18 + i * 7);
      });
      
      // Page footer
      pdf.setTextColor(79, 70, 229);
      pdf.text('http://app.aams.io', margin, pageHeight - 10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Page: 2', pageWidth - margin, pageHeight - 10, { align: 'right' });
      
      // ==================== PAGE 3: Summary Table ====================
      pdf.addPage();
      yPos = margin;
      
      // Header
      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AAMS', margin, 16);
      pdf.setFontSize(12);
      pdf.text(machine.machineName || machine.name || 'Machine Report', pageWidth / 2, 16, { align: 'center' });
      
      if (logo) {
        try {
          pdf.addImage(logo, 'JPEG', pageWidth - margin - 30, 3, 28, 19);
        } catch (e) {}
      }
      
      yPos = 35;
      
      // Title
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Machine Summary', margin, yPos);
      
      yPos += 12;
      
      // Summary Table
      const tableHeaders = ['Property', 'Value'];
      const tableData = [
        ['Machine ID', machine.machineId || machine.id || 'N/A'],
        ['Machine Name', machine.machineName || machine.name || 'N/A'],
        ['Customer ID', machine.customerId || 'N/A'],
        ['Status', (machine.status || 'Normal').toUpperCase()],
        ['Severity Level', `Level ${severity === 'A' ? 1 : severity === 'B' ? 2 : severity === 'C' ? 3 : 4} (${SEVERITY_COLORS[severity].text})`],
        ['Type', machine.type || 'OFFLINE'],
        ['Area ID', machine.areaId || 'N/A'],
        ['Subarea ID', machine.subareaId || 'N/A'],
        ['Report Date', new Date().toLocaleDateString()],
        ['Data Date', machine.date || 'N/A']
      ];
      
      const tableX = margin;
      const tableColWidths = [60, contentWidth - 60];
      const tableRowHeight = 10;
      
      // Table header
      pdf.setFillColor(30, 41, 59);
      pdf.rect(tableX, yPos, contentWidth, tableRowHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(tableHeaders[0], tableX + 5, yPos + 7);
      pdf.text(tableHeaders[1], tableX + tableColWidths[0] + 5, yPos + 7);
      
      yPos += tableRowHeight;
      
      // Table rows
      tableData.forEach((row, i) => {
        const bgColor = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        pdf.setFillColor(...bgColor);
        pdf.rect(tableX, yPos, contentWidth, tableRowHeight, 'F');
        
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(row[0], tableX + 5, yPos + 7);
        
        // Color code status
        if (row[0] === 'Status' || row[0] === 'Severity Level') {
          pdf.setTextColor(...SEVERITY_COLORS[severity].bg);
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setTextColor(30, 41, 59);
        }
        pdf.text(row[1], tableX + tableColWidths[0] + 5, yPos + 7);
        
        yPos += tableRowHeight;
      });
      
      // Table border
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.rect(tableX, yPos - tableData.length * tableRowHeight - tableRowHeight, contentWidth, (tableData.length + 1) * tableRowHeight, 'S');
      
      // Page footer
      pdf.setTextColor(79, 70, 229);
      pdf.text('http://app.aams.io', margin, pageHeight - 10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Page: 3', pageWidth - margin, pageHeight - 10, { align: 'right' });
      
      // Save PDF
      const fileName = `Report_${(machine.machineName || machine.machineId || 'Machine').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
      if (onGenerateEnd) onGenerateEnd();
    }
  };

  return (
    <button
      onClick={generatePDFReport}
      disabled={loading || !machine}
      className="btn btn-primary"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: (!machine || loading) ? 0.6 : 1,
        cursor: (!machine || loading) ? 'not-allowed' : 'pointer'
      }}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="spinning" />
          Generating...
        </>
      ) : (
        <>
          <FileText size={16} />
          Download Report
        </>
      )}
    </button>
  );
};

export default ReportGenerator;
