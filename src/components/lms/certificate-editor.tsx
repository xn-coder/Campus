
"use client";

import React, { useState, useEffect, useCallback, type FormEvent } from 'react';
import type { CertificateTemplate, CertificateElement } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Move, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { Rnd } from 'react-rnd';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '@/components/ui/separator';

interface CertificateEditorProps {
  templateType: string;
  getTemplateAction: (templateType: string) => Promise<{ ok: boolean; template?: CertificateTemplate; message?: string }>;
  saveTemplateAction: (
    templateType: string,
    templateData: Partial<Omit<CertificateTemplate, 'id' | 'template_type' | 'created_at' | 'updated_at'>>,
    backgroundImageFile?: File
  ) => Promise<{ ok: boolean; message: string; template?: CertificateTemplate }>;
  placeholderVariables: { value: string; label: string }[];
}

const defaultTemplate: Partial<CertificateTemplate> = {
  elements: [
    { id: 'el_title', content: 'Certificate of Completion', x: 226, y: 130, width: 500, height: 50, fontSize: 36, fontFamily: 'serif', color: '#000000', align: 'center' },
    { id: 'el_presented', content: 'This certificate is proudly presented to', x: 326, y: 220, width: 300, height: 30, fontSize: 18, fontFamily: 'sans-serif', color: '#555555', align: 'center' },
    { id: 'el_student_name', content: '{{student_name}}', x: 176, y: 270, width: 600, height: 60, fontSize: 48, fontFamily: 'cursive', color: '#000000', align: 'center' },
    { id: 'el_completion_text', content: 'for successfully completing the course', x: 276, y: 360, width: 400, height: 30, fontSize: 18, fontFamily: 'sans-serif', color: '#555555', align: 'center' },
    { id: 'el_course_name', content: '{{course_name}}', x: 226, y: 400, width: 500, height: 40, fontSize: 28, fontFamily: 'serif', color: '#333333', align: 'center' },
    { id: 'el_date_label', content: 'Date', x: 150, y: 500, width: 150, height: 20, fontSize: 14, fontFamily: 'sans-serif', color: '#555555', align: 'center' },
    { id: 'el_date_value', content: '{{completion_date}}', x: 150, y: 520, width: 150, height: 20, fontSize: 16, fontFamily: 'sans-serif', color: '#000000', align: 'center', },
    { id: 'el_signature_label', content: 'Signature', x: 650, y: 500, width: 150, height: 20, fontSize: 14, fontFamily: 'sans-serif', color: '#555555', align: 'center' },
  ],
  background_image_url: null,
};


const CertificateEditor: React.FC<CertificateEditorProps> = ({
  templateType,
  getTemplateAction,
  saveTemplateAction,
  placeholderVariables
}) => {
  const { toast } = useToast();
  const [template, setTemplate] = useState<Partial<CertificateTemplate>>({ elements: [] });
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplate = useCallback(async () => {
    setIsLoading(true);
    const result = await getTemplateAction(templateType);
    if (result.ok && result.template) {
      setTemplate(result.template);
      setBackgroundImagePreview(result.template.background_image_url || null);
    } else if (result.ok && !result.template) {
      // If there's no template in the DB, use the default one.
      setTemplate(defaultTemplate);
      setBackgroundImagePreview(null);
    } else if (!result.ok) {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [templateType, getTemplateAction, toast]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file) {
      setBackgroundImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setBackgroundImagePreview(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleElementChange = (index: number, field: keyof CertificateElement, value: any) => {
    setTemplate(prev => {
      const newElements = [...(prev.elements || [])];
      newElements[index] = { ...newElements[index], [field]: value };
      return { ...prev, elements: newElements };
    });
  };

  const addElement = () => {
    const newElement: CertificateElement = {
      id: `el_${Date.now()}`,
      content: 'New Text Field',
      x: 50,
      y: 50,
      width: 200,
      height: 30,
      fontSize: 16,
      fontFamily: 'serif',
      color: '#000000',
      align: 'left'
    };
    setTemplate(prev => ({ ...prev, elements: [...(prev.elements || []), newElement] }));
  };

  const removeElement = (index: number) => {
    setTemplate(prev => ({ ...prev, elements: (prev.elements || []).filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveTemplateAction(templateType, template, backgroundImageFile || undefined);
    if (result.ok) {
      toast({ title: "Success", description: "Certificate template saved." });
      if(result.template) {
        setTemplate(result.template);
        setBackgroundImagePreview(result.template.background_image_url || null);
        setBackgroundImageFile(null);
      }
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsSaving(false);
  };
  
  const fontFamilies = [
    { label: "Serif (Times New Roman)", value: "serif" },
    { label: "Sans-Serif (Arial)", value: "sans-serif" },
    { label: "Cursive (Brush Script)", value: "cursive" },
    { label: "Monospace (Courier)", value: "monospace" },
  ];

  if (isLoading) {
    return <Card><CardContent className="pt-6 text-center"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
  }
  
  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      <Card className="md:col-span-1">
        <CardHeader><CardTitle>Template Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Background Image (Recommended: 1123x794px)</Label>
            <Input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
          </div>
          <Separator />
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Text Elements</Label>
              <Button size="sm" variant="outline" onClick={addElement}><PlusCircle className="mr-2 h-4 w-4"/> Add Text</Button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {(template.elements || []).map((el, index) => (
                    <div key={el.id} className="p-3 border rounded-lg bg-background space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold">ELEMENT {index + 1}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeElement(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                         </div>
                         <div><Label className="text-xs">Text Content</Label><Input value={el.content} onChange={e => handleElementChange(index, 'content', e.target.value)} /></div>
                         <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-xs">Font Size (px)</Label><Input type="number" value={el.fontSize} onChange={e => handleElementChange(index, 'fontSize', Number(e.target.value))} /></div>
                            <div><Label className="text-xs">Color</Label><Input type="color" value={el.color} onChange={e => handleElementChange(index, 'color', e.target.value)} className="p-1"/></div>
                         </div>
                         <div>
                            <Label className="text-xs">Font Family</Label>
                            <Select value={el.fontFamily} onValueChange={(val) => handleElementChange(index, 'fontFamily', val)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{fontFamilies.map(f => <SelectItem key={f.value} value={f.value} style={{fontFamily: f.value}}>{f.label}</SelectItem>)}</SelectContent>
                            </Select>
                         </div>
                         <div>
                            <Label className="text-xs">Text Align</Label>
                            <Select value={el.align} onValueChange={(val) => handleElementChange(index, 'align', val)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                            </Select>
                         </div>
                    </div>
                ))}
            </div>
             <Card className="mt-4">
              <CardHeader className="p-3"><CardTitle className="text-sm">Available Placeholders</CardTitle></CardHeader>
              <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Click to copy a placeholder to use in your text elements.</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                      {placeholderVariables.map(p => (
                          <Button key={p.value} size="sm" variant="outline" className="text-xs" onClick={() => {
                              navigator.clipboard.writeText(p.value);
                              toast({ title: 'Copied!', description: `${p.value} copied to clipboard.` });
                          }}>{p.label}</Button>
                      ))}
                  </div>
              </CardContent>
            </Card>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
            Save Template
          </Button>
        </CardContent>
      </Card>
      
      <div className="md:col-span-2">
        <Card>
          <CardHeader><CardTitle>Certificate Preview</CardTitle></CardHeader>
          <CardContent className="p-4 bg-muted overflow-auto">
            <div
              className="relative bg-white shadow-lg"
              style={{
                width: '1123px',
                height: '794px',
                backgroundImage: `url(${backgroundImagePreview})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {(template.elements || []).map((el, index) => (
                <Rnd
                  key={el.id}
                  size={{ width: el.width, height: el.height }}
                  position={{ x: el.x, y: el.y }}
                  onDragStop={(e, d) => handleElementChange(index, 'x', d.x) & handleElementChange(index, 'y', d.y)}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    handleElementChange(index, 'width', parseInt(ref.style.width));
                    handleElementChange(index, 'height', parseInt(ref.style.height));
                    handleElementChange(index, 'x', position.x);
                    handleElementChange(index, 'y', position.y);
                  }}
                  className="border border-dashed border-primary/50 flex items-center justify-center"
                  dragHandleClassName="drag-handle"
                >
                  <div
                    className="drag-handle absolute top-0 left-0 cursor-move p-1 bg-primary/80 text-primary-foreground rounded-br-md"
                  ><Move className="w-3 h-3"/></div>
                  <div
                    style={{
                      fontSize: `${el.fontSize}px`,
                      fontFamily: el.fontFamily,
                      color: el.color,
                      width: '100%',
                      height: '100%',
                      textAlign: el.align as 'left' | 'center' | 'right',
                    }}
                    className="p-1"
                  >
                    {el.content}
                  </div>
                </Rnd>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CertificateEditor;
