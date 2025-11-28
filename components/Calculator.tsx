import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TAMANHO_PORCAO } from '../constants';
import { MetricsCard } from './MetricsCard';
import { Package, Tag, Hash, Save, Trash2, History as HistoryIcon, ArrowRight, Eraser, Share2, Loader2 } from 'lucide-react';
import { HistoryItem } from '../types';

const Calculator: React.FC = () => {
  // State for manual inputs
  const [productName, setProductName] = useState<string>('');
  const [packageCost, setPackageCost] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [packageUnits, setPackageUnits] = useState<string>('30');
  const [portionUnits, setPortionUnits] = useState<string>(String(TAMANHO_PORCAO));
  
  const [isSharing, setIsSharing] = useState(false);
  
  // Ref for capturing image
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // State for history
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pName = params.get('prod');
    const pCost = params.get('cost');
    const pPrice = params.get('price');
    const pUnits = params.get('punits');
    const sUnits = params.get('sunits');

    if (pName) setProductName(decodeURIComponent(pName));
    if (pCost) setPackageCost(pCost);
    if (pPrice) setSellingPrice(pPrice);
    if (pUnits) setPackageUnits(pUnits);
    if (sUnits) setPortionUnits(sUnits);
  }, []);

  const results = useMemo(() => {
    const cost = parseFloat(packageCost);
    const price = parseFloat(sellingPrice);
    const unitsInPkg = parseFloat(packageUnits);
    const unitsInPortion = parseFloat(portionUnits);

    // Validate inputs
    if (
      isNaN(cost) || cost <= 0 || 
      isNaN(price) || 
      isNaN(unitsInPkg) || unitsInPkg <= 0 ||
      isNaN(unitsInPortion) || unitsInPortion <= 0
    ) {
      return null;
    }

    const unitCost = cost / unitsInPkg;
    const portionCost = unitCost * unitsInPortion;
    const profit = price - portionCost;
    
    // Nova fórmula solicitada: (Preço Venda / Custo Porção) * 100%
    const margin = portionCost > 0 ? (price / portionCost) * 100 : 0;

    return {
      portionCost,
      lucroLiquido: profit,
      margemLucro: margin
    };
  }, [packageCost, sellingPrice, packageUnits, portionUnits]);

  const handleSaveToHistory = () => {
    if (!results) return;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      nome: productName.trim() || `Simulação ${history.length + 1}`,
      inputs: {
        custoPacote: parseFloat(packageCost),
        unidadesPacote: parseFloat(packageUnits),
        precoVenda: parseFloat(sellingPrice),
        unidadesPorcao: parseFloat(portionUnits),
      },
      resultado: results
    };

    setHistory(prev => [newItem, ...prev]);
  };

  const handleShareImage = async () => {
    if (!resultsRef.current || !results) return;
    setIsSharing(true);

    try {
      // @ts-ignore - html2canvas is loaded from CDN
      const canvas = await window.html2canvas(resultsRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: '#f3f4f6', // Match the container bg
        logging: false,
        useCORS: true
      });

      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) {
          setIsSharing(false);
          return;
        }

        const fileName = `calculadora-lucro-${Date.now()}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        // Try native sharing first (Mobile)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Resultado de Lucratividade',
              text: `Confira a simulação de lucro para: ${productName || 'Produto'}`,
            });
          } catch (err) {
            console.error('Error sharing:', err);
          }
        } else {
          // Fallback to download (Desktop)
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = fileName;
          link.click();
        }
        setIsSharing(false);
      }, 'image/png');

    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Não foi possível gerar a imagem. Tente novamente.');
      setIsSharing(false);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleClearForm = () => {
    setProductName('');
    setPackageCost('');
    setSellingPrice('');
    // Reset defaults
    setPackageUnits('30');
    setPortionUnits(String(TAMANHO_PORCAO));
    // Clear URL params
    window.history.pushState({}, '', window.location.pathname);
  };

  // Formatters
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatPercent = (val: number) => `${val.toFixed(0)}%`;

  const getMarginColor = (margin: number) => {
    if (margin < 100) return 'text-red-600'; // Prejuízo
    if (margin < 130) return 'text-yellow-600'; // Margem Baixa
    return 'text-green-600'; // Saudável
  };

  const getMarginBgColor = (margin: number) => {
    if (margin < 100) return 'bg-red-100 text-red-700';
    if (margin < 130) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getProfitColor = (profit: number) => 
     profit < 0 ? 'text-red-600' : 'text-slate-800';

  return (
    <div className="max-w-xl mx-auto px-4 pb-12">
      
      {/* Configuration Card */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-slate-100">
        
        {/* Product Name Input */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Nome do Produto
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Ex: Coxinha de Frango"
            className="block w-full rounded-xl border-gray-300 px-4 py-3 focus:border-slate-900 focus:ring-slate-900 text-base text-slate-900 bg-slate-50 border transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Package Data */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <Package size={16} className="text-blue-600" />
              Dados do Pacote
            </h4>
            
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Custo do Pacote</label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-400 text-sm">R$</span>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={packageCost}
                  onChange={(e) => setPackageCost(e.target.value)}
                  placeholder="0.00"
                  className="block w-full rounded-xl border-gray-300 pl-9 py-2.5 focus:border-blue-600 focus:ring-blue-600 sm:text-sm font-semibold text-slate-900 bg-white border"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Unidades no Pacote</label>
              <div className="relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Hash size={14} className="text-slate-400" />
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={packageUnits}
                  onChange={(e) => setPackageUnits(e.target.value)}
                  className="block w-full rounded-xl border-gray-300 pl-9 py-2.5 focus:border-blue-600 focus:ring-blue-600 sm:text-sm text-slate-900 bg-white border"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Portion Data */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <Tag size={16} className="text-orange-500" />
              Dados da Venda
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Preço de Venda (Sugestão)</label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-400 text-sm">R$</span>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                  className="block w-full rounded-xl border-gray-300 pl-9 py-2.5 focus:border-orange-500 focus:ring-orange-500 sm:text-sm font-semibold text-slate-900 bg-white border"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Unidades na Porção</label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Hash size={14} className="text-slate-400" />
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={portionUnits}
                  onChange={(e) => setPortionUnits(e.target.value)}
                  className="block w-full rounded-xl border-gray-300 pl-9 py-2.5 focus:border-orange-500 focus:ring-orange-500 sm:text-sm text-slate-900 bg-white border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
           <button 
             onClick={handleClearForm}
             className="text-slate-400 hover:text-slate-600 p-2 text-sm flex items-center gap-1 transition-colors"
             title="Limpar formulário"
           >
             <Eraser size={16} />
             Limpar
           </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4 mb-10">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resultado Atual</h3>
        </div>
        
        {results ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Capture Area Ref */}
            <div ref={resultsRef} className="grid grid-cols-1 gap-4 bg-[#f3f4f6] p-4 -m-4 rounded-xl">
              <div className="bg-white p-4 rounded-xl shadow-sm text-center border border-slate-200">
                <h2 className="font-bold text-xl text-slate-800 leading-tight mb-1">{productName || 'Simulação de Produto'}</h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Relatório de Lucratividade</p>
                
                {/* Information Summary for Shared Image */}
                <div className="flex items-center justify-center gap-6 pt-3 mt-2 border-t border-slate-100">
                     <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Custo Pacote</span>
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(parseFloat(packageCost))}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-100"></div>
                    <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Preço Venda (Sugestão)</span>
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(parseFloat(sellingPrice))}</span>
                    </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <MetricsCard 
                    label="Custo da Porção" 
                    value={formatCurrency(results.portionCost)} 
                    subValue={`${portionUnits} unid. / porção`}
                />
                <MetricsCard 
                    label="Lucro Líquido" 
                    value={formatCurrency(results.lucroLiquido)}
                    colorClass={getProfitColor(results.lucroLiquido)}
                />
              </div>
              
              <div className={`p-6 rounded-xl shadow-lg border-2 flex flex-col items-center justify-center text-center transition-colors duration-300 ${
                results.margemLucro < 100 ? 'bg-red-50 border-red-100' : 
                results.margemLucro < 130 ? 'bg-yellow-50 border-yellow-100' : 
                'bg-emerald-50 border-emerald-100'
              }`}>
                <span className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-2">
                  Lucratividade (Venda/Custo)
                </span>
                <span className={`text-5xl font-extrabold ${getMarginColor(results.margemLucro)}`}>
                  {formatPercent(results.margemLucro)}
                </span>
                
                <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                    results.margemLucro < 100 ? 'bg-red-100 text-red-700' : 
                    results.margemLucro < 130 ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-green-100 text-green-700'
                 }`}>
                   <div className={`h-2 w-2 rounded-full ${
                      results.margemLucro < 100 ? 'bg-red-500' : 
                      results.margemLucro < 130 ? 'bg-yellow-500' : 
                      'bg-green-500'
                   }`}></div>
                   <span className="text-xs font-bold uppercase">
                      {results.margemLucro < 100 ? 'Prejuízo' : 
                       results.margemLucro < 130 ? 'Baixa' : 
                       'Saudável'}
                   </span>
                 </div>
              </div>
            </div>

            {/* Buttons Row (Outside Capture) */}
            <div className="mt-8 w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                 <button 
                  onClick={handleSaveToHistory}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                 >
                   <Save size={18} />
                   Salvar no Histórico
                 </button>

                 <button 
                  onClick={handleShareImage}
                  disabled={isSharing}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                 >
                   {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                   {isSharing ? 'Gerando...' : 'Compartilhar Imagem'}
                 </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-xl p-8 border border-slate-200 border-dashed text-center">
            <p className="text-slate-400 text-sm font-medium">
              Preencha o <strong>Custo do Pacote</strong> para ver a análise financeira.
            </p>
          </div>
        )}
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="animate-in fade-in duration-700">
          <div className="flex items-center gap-2 mb-4 px-1">
             <HistoryIcon size={18} className="text-slate-400" />
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Histórico ({history.length})</h3>
          </div>

          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-800 truncate text-sm">
                      {item.nome}
                    </h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getMarginBgColor(item.resultado.margemLucro)}`}>
                       {formatPercent(item.resultado.margemLucro)}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-slate-500 gap-3">
                    <span>Venda: <span className="font-medium text-slate-700">{formatCurrency(item.inputs.precoVenda)}</span></span>
                    <ArrowRight size={10} className="text-slate-300" />
                    <span>Lucro: <span className={`font-medium ${item.resultado.lucroLiquido < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(item.resultado.lucroLiquido)}</span></span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteHistoryItem(item.id)}
                  className="ml-3 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calculator;