const { jsPDF } = require('jspdf');

function exportJSON(campaignData) {
  return JSON.stringify(campaignData, null, 2);
}

function exportMarkdown(campaignData) {
  const { campaign, generations } = campaignData;
  const product = JSON.parse(campaign.product_data);
  let md = '';

  md += `# Overload Campaign: ${campaign.product_name}\n\n`;
  md += `**Created:** ${campaign.created_at}\n\n`;

  md += `## Product Summary\n\n`;
  md += `- **Name:** ${product.name}\n`;
  if (product.price) md += `- **Price:** ${product.price}\n`;
  if (product.targetAudience) md += `- **Target Audience:** ${product.targetAudience}\n`;
  if (product.description) md += `- **Description:** ${product.description}\n`;
  if (product.features?.length) {
    md += `- **Key Features:**\n`;
    product.features.forEach(f => { md += `  - ${f}\n`; });
  }
  md += '\n';

  const angles = generations.find(g => g.stage === 'angles');
  if (angles) {
    const data = JSON.parse(angles.output);
    md += `## Ad Angles\n\n`;
    data.forEach((angle, i) => {
      md += `### ${i + 1}. ${angle.angle_name}\n\n`;
      md += `- **Framework:** ${angle.framework}\n`;
      md += `- **Target Emotion:** ${angle.target_emotion}\n`;
      md += `- **Strength:** ${angle.estimated_strength}\n`;
      md += `- **Target Segment:** ${angle.target_audience_segment}\n`;
      md += `- **Hook:** "${angle.hook}"\n`;
      md += `- **Concept:** ${angle.concept}\n`;
      md += `- **Why It Works:** ${angle.why_it_works}\n\n`;
    });
  }

  const scripts = generations.find(g => g.stage === 'scripts');
  if (scripts) {
    const data = JSON.parse(scripts.output);
    md += `## Scripts\n\n`;
    (Array.isArray(data) ? data : [data]).forEach((script, i) => {
      md += `### Script ${i + 1}: ${script.angle_name}\n\n`;
      md += `**Duration:** ${script.total_duration}s | **Platform:** ${script.platform}\n\n`;
      if (script.segments) {
        md += `| Timestamp | Section | Spoken Words | Visual Direction | Text Overlay |\n`;
        md += `|-----------|---------|-------------|-----------------|-------------|\n`;
        script.segments.forEach(seg => {
          md += `| ${seg.timestamp} | ${seg.section} | ${seg.spoken_words} | ${seg.visual_direction} | ${seg.text_overlay || '-'} |\n`;
        });
      }
      md += '\n';
      if (script.thumbnail_concept) md += `**Thumbnail Concept:** ${script.thumbnail_concept}\n\n`;
      if (script.hashtag_suggestions?.length) md += `**Hashtags:** ${script.hashtag_suggestions.join(' ')}\n\n`;
    });
  }

  const hooks = generations.find(g => g.stage === 'hooks');
  if (hooks) {
    const data = JSON.parse(hooks.output);
    md += `## Hook Library (${data.length} hooks)\n\n`;
    const grouped = {};
    data.forEach(h => {
      if (!grouped[h.hook_type]) grouped[h.hook_type] = [];
      grouped[h.hook_type].push(h);
    });
    Object.entries(grouped).forEach(([type, items]) => {
      md += `### ${type}\n\n`;
      items.forEach(h => {
        md += `- **"${h.hook_text}"** (Stop rating: ${h.scroll_stop_rating}/10)\n`;
        md += `  - Visual: ${h.visual_suggestion}\n`;
        md += `  - Best with: ${h.best_paired_with_angle}\n\n`;
      });
    });
  }

  const storyboard = generations.find(g => g.stage === 'storyboard');
  if (storyboard) {
    const data = JSON.parse(storyboard.output);
    const boards = Array.isArray(data) ? data : [data];
    md += `## Storyboards\n\n`;
    boards.forEach((board, i) => {
      md += `### Storyboard ${i + 1}\n\n`;
      md += `**Pacing:** ${board.overall_pacing} | **Color Grade:** ${board.color_grade}\n\n`;
      if (board.scenes) {
        board.scenes.forEach(scene => {
          md += `#### Scene ${scene.scene_number} (${scene.timestamp})\n\n`;
          md += `- **Visual:** ${scene.visual_description}\n`;
          md += `- **Camera:** ${scene.camera_direction} / ${scene.camera_movement}\n`;
          md += `- **Action:** ${scene.subject_action}\n`;
          if (scene.text_overlay?.text) md += `- **Text Overlay:** "${scene.text_overlay.text}" (${scene.text_overlay.position}, ${scene.text_overlay.style})\n`;
          md += `- **Transition:** ${scene.transition_to_next}\n`;
          md += `- **AI Video Prompt:** ${scene.ai_video_prompt}\n\n`;
        });
      }
    });
  }

  const ugc = generations.find(g => g.stage === 'ugc');
  if (ugc) {
    const data = JSON.parse(ugc.output);
    md += `## UGC Briefs\n\n`;
    data.forEach((brief, i) => {
      md += `### Brief ${i + 1}: ${brief.format}\n\n`;
      md += `- **Creator Persona:** ${brief.creator_persona.vibe} (${brief.creator_persona.age_range})\n`;
      md += `- **Setting:** ${brief.creator_persona.setting}\n`;
      md += `- **Tone:** ${brief.spoken_tone}\n\n`;
      md += `**Script Outline:**\n`;
      md += `- Opening: ${brief.script_outline.opening}\n`;
      md += `- Middle: ${brief.script_outline.middle}\n`;
      md += `- Close: ${brief.script_outline.close}\n\n`;
      if (brief.do_list?.length) {
        md += `**Do:** ${brief.do_list.join(', ')}\n\n`;
      }
      if (brief.dont_list?.length) {
        md += `**Don't:** ${brief.dont_list.join(', ')}\n\n`;
      }
    });
  }

  md += `---\n\n*Generated by Overload — Marketing OS*\n`;
  return md;
}

function exportPDF(campaignData) {
  const { campaign, generations } = campaignData;
  const product = JSON.parse(campaign.product_data);
  const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPage(needed = 20) {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function addTitle(text, size = 18) {
    checkPage(20);
    doc.setFontSize(size);
    doc.setFont(undefined, 'bold');
    doc.text(text, margin, y);
    y += size * 0.6;
  }

  function addText(text, size = 10) {
    checkPage(10);
    doc.setFontSize(size);
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach(line => {
      checkPage(6);
      doc.text(line, margin, y);
      y += 5;
    });
  }

  function addLabel(label, value, size = 10) {
    checkPage(10);
    doc.setFontSize(size);
    doc.setFont(undefined, 'bold');
    doc.text(`${label}: `, margin, y);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(String(value), contentWidth - labelWidth);
    doc.text(lines[0] || '', margin + labelWidth, y);
    y += 5;
    for (let i = 1; i < lines.length; i++) {
      checkPage(6);
      doc.text(lines[i], margin, y);
      y += 5;
    }
  }

  function addSpacer(h = 5) { y += h; }

  addTitle('Overload Campaign Brief', 22);
  addSpacer(5);
  addTitle(campaign.product_name, 16);
  addSpacer(3);
  addText(`Created: ${campaign.created_at}`);
  addSpacer(10);

  addTitle('Product Summary', 14);
  addSpacer(3);
  addLabel('Name', product.name);
  if (product.price) addLabel('Price', product.price);
  if (product.targetAudience) addLabel('Target Audience', product.targetAudience);
  if (product.description) {
    addLabel('Description', '');
    addText(product.description);
  }
  if (product.features?.length) {
    addLabel('Key Features', '');
    product.features.forEach(f => addText(`  - ${f}`));
  }
  addSpacer(8);

  const angles = generations.find(g => g.stage === 'angles');
  if (angles) {
    const data = JSON.parse(angles.output);
    addTitle('Ad Angles', 14);
    addSpacer(3);
    data.forEach((angle, i) => {
      checkPage(40);
      addTitle(`${i + 1}. ${angle.angle_name}`, 11);
      addLabel('Framework', angle.framework);
      addLabel('Target Emotion', angle.target_emotion);
      addLabel('Strength', angle.estimated_strength);
      addLabel('Hook', `"${angle.hook}"`);
      addText(angle.concept);
      addSpacer(5);
    });
  }

  const scripts = generations.find(g => g.stage === 'scripts');
  if (scripts) {
    const data = JSON.parse(scripts.output);
    doc.addPage();
    y = margin;
    addTitle('Scripts', 14);
    addSpacer(3);
    (Array.isArray(data) ? data : [data]).forEach((script, i) => {
      checkPage(30);
      addTitle(`Script ${i + 1}: ${script.angle_name}`, 11);
      addLabel('Duration', `${script.total_duration}s`);
      addLabel('Platform', script.platform);
      addSpacer(3);
      if (script.segments) {
        script.segments.forEach(seg => {
          checkPage(25);
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`[${seg.timestamp}] ${seg.section}`, margin, y);
          y += 4;
          doc.setFont(undefined, 'normal');
          addText(`Spoken: "${seg.spoken_words}"`, 9);
          addText(`Visual: ${seg.visual_direction}`, 9);
          if (seg.text_overlay) addText(`Text: ${seg.text_overlay}`, 9);
          addSpacer(3);
        });
      }
      addSpacer(8);
    });
  }

  const hooks = generations.find(g => g.stage === 'hooks');
  if (hooks) {
    const data = JSON.parse(hooks.output);
    doc.addPage();
    y = margin;
    addTitle('Hook Library', 14);
    addSpacer(3);
    data.forEach((h, i) => {
      checkPage(15);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}. [${h.hook_type}]`, margin, y);
      y += 4;
      doc.setFont(undefined, 'normal');
      addText(`"${h.hook_text}"`, 9);
      addSpacer(2);
    });
  }

  const storyboard = generations.find(g => g.stage === 'storyboard');
  if (storyboard) {
    const data = JSON.parse(storyboard.output);
    const boards = Array.isArray(data) ? data : [data];
    doc.addPage();
    y = margin;
    addTitle('Storyboards', 14);
    boards.forEach((board, i) => {
      addSpacer(3);
      addTitle(`Storyboard ${i + 1}`, 11);
      if (board.scenes) {
        board.scenes.forEach(scene => {
          checkPage(35);
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`Scene ${scene.scene_number} (${scene.timestamp})`, margin, y);
          y += 4;
          doc.setFont(undefined, 'normal');
          addText(scene.visual_description, 9);
          addLabel('Camera', `${scene.camera_direction} / ${scene.camera_movement}`);
          addText(`AI Prompt: ${scene.ai_video_prompt}`, 8);
          addSpacer(4);
        });
      }
    });
  }

  const ugc = generations.find(g => g.stage === 'ugc');
  if (ugc) {
    const data = JSON.parse(ugc.output);
    doc.addPage();
    y = margin;
    addTitle('UGC Briefs', 14);
    addSpacer(3);
    data.forEach((brief, i) => {
      checkPage(40);
      addTitle(`${i + 1}. ${brief.format}`, 11);
      addLabel('Creator', `${brief.creator_persona.vibe} (${brief.creator_persona.age_range})`);
      addLabel('Setting', brief.creator_persona.setting);
      addLabel('Tone', brief.spoken_tone);
      addText(`Opening: ${brief.script_outline.opening}`, 9);
      addText(`Middle: ${brief.script_outline.middle}`, 9);
      addText(`Close: ${brief.script_outline.close}`, 9);
      addSpacer(5);
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

module.exports = { exportJSON, exportMarkdown, exportPDF };
