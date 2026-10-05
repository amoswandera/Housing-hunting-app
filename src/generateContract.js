import jsPDF from 'jspdf'

/**
 * Generate a rental contract PDF
 * @param {Object} contractData - Contract details
 * @param {string} contractData.agentName - Agent/Landlord name
 * @param {string} contractData.agentAddress - Agent/Landlord address
 * @param {string} contractData.agentPhone - Agent/Landlord phone
 * @param {string} contractData.agentEmail - Agent/Landlord email
 * @param {string} contractData.tenantName - Tenant name
 * @param {string} contractData.tenantId - Tenant ID number
 * @param {string} contractData.tenantPhone - Tenant phone
 * @param {string} contractData.tenantEmail - Tenant email
 * @param {string} contractData.tenantAddress - Tenant current address
 * @param {string} contractData.propertyName - Property name
 * @param {string} contractData.propertyAddress - Property address
 * @param {string} contractData.propertyType - Property type (e.g., "Three bedroom")
 * @param {number} contractData.bedrooms - Number of bedrooms
 * @param {boolean} contractData.parking - Parking available
 * @param {string} contractData.startDate - Lease start date
 * @param {string} contractData.endDate - Lease end date
 * @param {number} contractData.months - Lease duration in months
 * @param {number} contractData.rent - Monthly rent in KES
 * @param {number} contractData.deposit - Security deposit in KES
 * @param {string} contractData.paybill - M-Pesa paybill number
 * @param {string} contractData.bankAccount - Bank account for rent payment
 * @param {Object} contractData.utilities - Utilities responsibilities
 * @param {boolean} contractData.utilities.electricity - Tenant pays electricity
 * @param {boolean} contractData.utilities.water - Tenant pays water
 * @param {boolean} contractData.utilities.gas - Tenant pays gas
 * @param {boolean} contractData.utilities.internet - Tenant pays internet
 * @param {boolean} contractData.utilities.waste - Tenant pays waste collection
 * @param {boolean} contractData.petsAllowed - Are pets allowed
 * @param {string} contractData.petsDetails - Pet details if allowed
 * @param {boolean} contractData.parkingIncluded - Is parking included
 * @param {string} contractData.parkingDetails - Parking details
 * @returns {jsPDF} PDF document instance
 */
export const generateContractPDF = (contractData) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let yPosition = margin

  // Helper function to add text with word wrap
  const addText = (text, x, y, fontSize = 10, fontStyle = 'normal', maxWidth = contentWidth) => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', fontStyle)
    const lines = doc.splitTextToSize(text, maxWidth)
    doc.text(lines, x, y)
    return y + (lines.length * (fontSize * 0.5))
  }

  // Helper function to add section header
  const addSectionHeader = (text, y) => {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    return y + 8
  }

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('RESIDENTIAL LEASE AGREEMENT', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('HABITAT HOUSING MARKETPLACE', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  // Divider line
  doc.setDrawColor(0, 100, 0)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // Section 1: Parties to the Agreement
  yPosition = addSectionHeader('1. PARTIES TO THE AGREEMENT', yPosition)
  yPosition = addText(`THIS RESIDENTIAL LEASE AGREEMENT is made and entered into on this ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`, margin, yPosition)
  yPosition += 5
  yPosition = addText('BETWEEN:', margin, yPosition, 10, 'bold')
  yPosition = addText(`LANDLORD/AGENT: ${contractData.agentName || '________________'}`, margin + 5, yPosition)
  yPosition = addText(`Address: ${contractData.agentAddress || '________________'}`, margin + 5, yPosition)
  yPosition = addText(`Phone: ${contractData.agentPhone || '________________'}`, margin + 5, yPosition)
  yPosition = addText(`Email: ${contractData.agentEmail || '________________'}`, margin + 5, yPosition)
  yPosition += 5
  yPosition = addText('AND:', margin, yPosition, 10, 'bold')
  yPosition = addText(`TENANT: ${contractData.tenantName || '________________'}`, margin + 5, yPosition)
  yPosition = addText(`ID Number: ${contractData.tenantId || '________________'}`, margin + 5, yPosition)
  yPosition = addText(`Phone: ${contractData.tenantPhone || '________________'}`, margin + 5, yPosition)
  yPosition = addText(`Email: ${contractData.tenantEmail || '________________'}`, margin + 5, yPosition)
  yPosition = addText(`Current Address: ${contractData.tenantAddress || '________________'}`, margin + 5, yPosition)
  yPosition += 10

  // Section 2: Property Description
  yPosition = addSectionHeader('2. PROPERTY DESCRIPTION', yPosition)
  yPosition = addText(`Property Name: ${contractData.propertyName || '________________'}`, margin, yPosition)
  yPosition = addText(`Property Address: ${contractData.propertyAddress || '________________'}`, margin, yPosition)
  yPosition = addText(`Property Type: ${contractData.propertyType || '________________'}`, margin, yPosition)
  yPosition = addText(`Number of Bedrooms: ${contractData.bedrooms || '________________'}`, margin, yPosition)
  yPosition = addText(`Parking Available: ${contractData.parking ? 'Yes' : 'No'}`, margin, yPosition)
  yPosition += 10

  // Section 3: Term of Lease
  yPosition = addSectionHeader('3. TERM OF LEASE', yPosition)
  yPosition = addText(`The term of this Lease shall commence on ${contractData.startDate || '________________'} and shall continue for a period of ${contractData.months || '________________'} month(s), terminating on ${contractData.endDate || '________________'}.`, margin, yPosition)
  yPosition += 5
  yPosition = addText('3.1 Holdover Period: If the Tenant remains in possession of the Premises after the expiration of the Lease term without the Landlord\'s written consent, the Tenant shall become a month-to-month tenant at a rent of KES ________________ per month, payable in advance.', margin, yPosition, 9)
  yPosition += 10

  // Section 4: Rent
  yPosition = addSectionHeader('4. RENT', yPosition)
  yPosition = addText(`4.1 Monthly Rent: The Tenant agrees to pay the Landlord a monthly rent of KES ${contractData.rent?.toLocaleString() || '________________'}.`, margin, yPosition)
  yPosition += 5
  yPosition = addText('4.2 Payment Schedule: Rent shall be payable in advance on or before the 5th day of each month.', margin, yPosition)
  yPosition += 5
  yPosition = addText('4.3 Payment Method: Rent shall be paid via:', margin, yPosition)
  yPosition = addText(`- Bank Transfer to Account: ${contractData.bankAccount || '________________'}`, margin + 5, yPosition)
  yPosition = addText(`- M-Pesa Paybill: ${contractData.paybill || '________________'}`, margin + 5, yPosition)
  yPosition += 5
  yPosition = addText('4.4 Late Payment: If rent is not paid by the 5th day of the month, a late fee of KES 1,000 shall be charged.', margin, yPosition)
  yPosition += 10

  // Section 5: Security Deposit
  yPosition = addSectionHeader('5. SECURITY DEPOSIT', yPosition)
  yPosition = addText(`5.1 Deposit Amount: The Tenant shall pay a security deposit of KES ${contractData.deposit?.toLocaleString() || '________________'} equivalent to 1 month(s) rent.`, margin, yPosition)
  yPosition += 5
  yPosition = addText('5.2 Deposit Purpose: This deposit shall be held as security for damage to the Premises beyond normal wear and tear, unpaid rent, breach of this Lease agreement, and cleaning costs upon termination.', margin, yPosition, 9)
  yPosition += 5
  yPosition = addText('5.3 Deposit Return: The security deposit shall be returned to the Tenant within 30 days after the termination of this Lease, less any deductions for damages or unpaid obligations.', margin, yPosition, 9)
  yPosition += 10

  // Section 6: Utilities and Services
  yPosition = addSectionHeader('6. UTILITIES AND SERVICES', yPosition)
  yPosition = addText('6.1 Tenant Responsibilities: The Tenant shall be responsible for payment of the following utilities:', margin, yPosition)
  yPosition = addText(`- Electricity: ${contractData.utilities?.electricity ? 'Yes' : 'No'}`, margin + 5, yPosition)
  yPosition = addText(`- Water: ${contractData.utilities?.water ? 'Yes' : 'No'}`, margin + 5, yPosition)
  yPosition = addText(`- Gas: ${contractData.utilities?.gas ? 'Yes' : 'No'}`, margin + 5, yPosition)
  yPosition = addText(`- Internet: ${contractData.utilities?.internet ? 'Yes' : 'No'}`, margin + 5, yPosition)
  yPosition = addText(`- Waste collection: ${contractData.utilities?.waste ? 'Yes' : 'No'}`, margin + 5, yPosition)
  yPosition += 5
  yPosition = addText('6.2 Landlord Responsibilities: The Landlord shall be responsible for property taxes, building insurance, common area maintenance, and security services.', margin, yPosition, 9)
  yPosition += 10

  // Section 7: Use of Premises
  yPosition = addSectionHeader('7. USE OF PREMISES', yPosition)
  yPosition = addText('7.1 Residential Use Only: The Premises shall be used solely for residential purposes. No commercial business activities shall be conducted on the Premises without the Landlord\'s prior written consent.', margin, yPosition, 9)
  yPosition += 5
  yPosition = addText('7.2 Occupancy: The Premises shall be occupied only by the Tenant and named occupants. No subletting or assignment of this Lease shall be permitted without the Landlord\'s prior written consent.', margin, yPosition, 9)
  yPosition += 5
  yPosition = addText('7.3 Quiet Enjoyment: The Tenant shall have the right to quiet enjoyment of the Premises, provided they comply with all terms of this Lease.', margin, yPosition, 9)
  yPosition += 10

  // Section 8: Maintenance and Repairs
  yPosition = addSectionHeader('8. MAINTENANCE AND REPAIRS', yPosition)
  yPosition = addText('8.1 Landlord Responsibilities: The Landlord shall maintain the Premises in a habitable condition, including structural repairs, plumbing and electrical systems, roof and external walls, and built-in appliances (if any).', margin, yPosition, 9)
  yPosition += 5
  yPosition = addText('8.2 Tenant Responsibilities: The Tenant shall keep the Premises clean and sanitary, promptly report any maintenance issues to the Landlord, pay for damages caused by the Tenant\'s negligence or misuse, replace light bulbs and perform minor maintenance, and maintain the Premises in good condition.', margin, yPosition, 9)
  yPosition += 5
  yPosition = addText('8.3 Access for Repairs: The Tenant shall allow the Landlord reasonable access to the Premises for inspections, repairs, and maintenance, with at least 24 hours\' notice, except in emergencies.', margin, yPosition, 9)
  yPosition += 10

  // Section 9: Pets
  yPosition = addSectionHeader('9. PETS', yPosition)
  yPosition = addText(`Pets Allowed: ${contractData.petsAllowed ? 'Yes' : 'No'}`, margin, yPosition)
  if (contractData.petsAllowed && contractData.petsDetails) {
    yPosition = addText(`Pet Details: ${contractData.petsDetails}`, margin, yPosition)
  }
  yPosition += 10

  // Section 10: Parking
  yPosition = addSectionHeader('10. PARKING', yPosition)
  yPosition = addText(`Parking Included: ${contractData.parkingIncluded ? 'Yes' : 'No'}`, margin, yPosition)
  if (contractData.parkingIncluded && contractData.parkingDetails) {
    yPosition = addText(`Parking Details: ${contractData.parkingDetails}`, margin, yPosition)
  }
  yPosition += 10

  // Section 11: Termination of Lease
  yPosition = addSectionHeader('11. TERMINATION OF LEASE', yPosition)
  yPosition = addText('11.1 By Tenant: The Tenant may terminate this Lease by providing 30 days\' written notice to the Landlord.', margin, yPosition, 9)
  yPosition += 5
  yPosition = addText('11.2 By Landlord: The Landlord may terminate this Lease by providing 30 days\' written notice to the Tenant.', margin, yPosition, 9)
  yPosition += 5
  yPosition = addText('11.3 Termination for Cause: The Landlord may terminate this Lease immediately if the Tenant fails to pay rent when due, violates any term of this Lease, causes substantial damage to the Premises, engages in illegal activities on the Premises, or creates a nuisance or disturbance.', margin, yPosition, 9)
  yPosition += 10

  // Section 12: Security and Safety
  yPosition = addSectionHeader('12. SECURITY AND SAFETY', yPosition)
  yPosition = addText('12.1 Keys and Access: The Tenant shall be provided with 2 sets of keys. All keys must be returned upon termination of this Lease.', margin, yPosition, 9)
  yPosition += 5
  yPosition = addText('12.2 Lock Changes: The Tenant shall not change any locks without the Landlord\'s prior written consent.', margin, yPosition, 9)
  yPosition += 5
  yPosition = addText('12.3 Security Deposit Deduction: The cost of replacing lost keys or changing locks due to Tenant negligence shall be deducted from the security deposit.', margin, yPosition, 9)
  yPosition += 10

  // Section 13: Indemnification
  yPosition = addSectionHeader('13. INDEMNIFICATION', yPosition)
  yPosition = addText('The Tenant shall indemnify and hold the Landlord harmless from any claims, damages, or liabilities arising from the Tenant\'s use of the Premises, except for claims arising from the Landlord\'s negligence.', margin, yPosition, 9)
  yPosition += 10

  // Section 14: Governing Law
  yPosition = addSectionHeader('14. GOVERNING LAW', yPosition)
  yPosition = addText('This Lease shall be governed by and construed in accordance with the laws of the Republic of Kenya. Any disputes arising from this Lease shall be resolved through the Kenyan courts.', margin, yPosition, 9)
  yPosition += 10

  // Section 15: Notices
  yPosition = addSectionHeader('15. NOTICES', yPosition)
  yPosition = addText('All notices required or permitted under this Lease shall be in writing and shall be deemed delivered when personally delivered, sent by registered mail, or sent by email to the addresses specified in Section 1.', margin, yPosition, 9)
  yPosition += 10

  // Section 16: Entire Agreement
  yPosition = addSectionHeader('16. ENTIRE AGREEMENT', yPosition)
  yPosition = addText('This Lease constitutes the entire agreement between the parties and supersedes all prior discussions, agreements, or understandings, whether written or oral. No modification of this Lease shall be binding unless in writing and signed by both parties.', margin, yPosition, 9)
  yPosition += 10

  // Check if we need a new page for signatures
  if (yPosition > pageHeight - 100) {
    doc.addPage()
    yPosition = margin
  }

  // Section 17: Signatures
  yPosition = addSectionHeader('17. SIGNATURES', yPosition)
  yPosition = addText('IN WITNESS WHEREOF, the parties have executed this Lease as of the date first written above.', margin, yPosition, 9)
  yPosition += 15

  yPosition = addText('LANDLORD/AGENT:', margin, yPosition, 10, 'bold')
  yPosition = addText(`Name: ${contractData.agentName || '________________'}`, margin, yPosition)
  yPosition = addText('Signature: ____________________', margin, yPosition)
  yPosition = addText(`Date: ${new Date().toLocaleDateString('en-GB')}`, margin, yPosition)
  yPosition += 15

  yPosition = addText('TENANT:', margin, yPosition, 10, 'bold')
  yPosition = addText(`Name: ${contractData.tenantName || '________________'}`, margin, yPosition)
  yPosition = addText(`ID Number: ${contractData.tenantId || '________________'}`, margin, yPosition)
  yPosition = addText('Signature: ____________________', margin, yPosition)
  yPosition = addText(`Date: ${new Date().toLocaleDateString('en-GB')}`, margin, yPosition)
  yPosition += 15

  // Section 18: Witnesses
  yPosition = addSectionHeader('18. WITNESSES', yPosition)
  yPosition = addText('WITNESS 1:', margin, yPosition, 10, 'bold')
  yPosition = addText('Name: ____________________', margin, yPosition)
  yPosition = addText('Signature: ____________________', margin, yPosition)
  yPosition = addText(`Date: ${new Date().toLocaleDateString('en-GB')}`, margin, yPosition)
  yPosition += 15

  yPosition = addText('WITNESS 2:', margin, yPosition, 10, 'bold')
  yPosition = addText('Name: ____________________', margin, yPosition)
  yPosition = addText('Signature: ____________________', margin, yPosition)
  yPosition = addText(`Date: ${new Date().toLocaleDateString('en-GB')}`, margin, yPosition)
  yPosition += 15

  // Footer
  yPosition = pageHeight - 20
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text('This contract template is provided by Habitat Housing Marketplace. For legal advice specific to your situation, please consult a qualified attorney.', pageWidth / 2, yPosition, { align: 'center' })

  return doc
}

/**
 * Download the contract PDF
 * @param {Object} contractData - Contract details
 * @param {string} fileName - Name of the file to download
 */
export const downloadContractPDF = (contractData, fileName = 'rental_contract.pdf') => {
  const doc = generateContractPDF(contractData)
  doc.save(fileName)
}

/**
 * Get the contract PDF as a blob
 * @param {Object} contractData - Contract details
 * @returns {Blob} PDF blob
 */
export const getContractPDFBlob = (contractData) => {
  const doc = generateContractPDF(contractData)
  return doc.output('blob')
}
