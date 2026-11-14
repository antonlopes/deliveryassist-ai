import React from 'react';
import {describe,it,expect} from 'vitest';
import {render,screen} from '@testing-library/react';
import {ThemeProvider} from '@mui/material';
import {theme} from '../styles/theme.js';
import {StatusBadge,PriorityBadge,Empty,FormatDate,PageControls} from './Shared.jsx';
function wrap(element){return render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);}
describe('UI',()=>{
 it('mostra status de ocorrência com rótulo pt-BR',()=>{wrap(<StatusBadge value="IN_PROGRESS"/>);expect(screen.getByText('Em andamento')).toBeInTheDocument();});
 it('renderiza prioridade alta',()=>{wrap(<PriorityBadge value="HIGH"/>);expect(screen.getByText('Alta')).toBeInTheDocument();});
 it('informa lista vazia',()=>{wrap(<Empty message="Nenhum pedido"/>);expect(screen.getByText('Nenhum pedido')).toBeInTheDocument();});
 it('usa fuso America/Sao_Paulo',()=>{wrap(<FormatDate value="2026-11-13T13:00:00.000Z"/>);expect(screen.getByText(/10:00/)).toBeInTheDocument();});
 it('exibe paginação',()=>{wrap(<PageControls pagination={{page:1,total_pages:3,total_items:55,page_size:20}} onPage={()=>{}}/>);expect(screen.getByText(/55 registros/)).toBeInTheDocument();});
});
