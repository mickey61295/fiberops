
/*    
;=============================================    
; Author           :  Global Software's  
; Create date      :  16/11/2023 
; Create By        :  Chandru 
; Description      :  Balu Cutting Panel report 
; Change Person    :  Chandru
; Last Change Date :  01/Feb/2024 1.00 PM
; =============================================     
*/    
create   PROCEDURE SP_Cuttingpanelrpt(@OrdID nvarchar(4000),@styleno varchar(256)) as  

insert into temp_cutpanel_rpt(ordid,styleno ,clr,part,panel,cutqty,unit,issue,delfor,stock,delunit)   
select Ordid,StyleNo,Clrid,Partid,CompId,sum(Prodpcs) as cutqty,CoyId,0,0,0,''   from Trs_AddPanelEntry a inner join Trs_AddPanelEntryQty_Component b on a.Id = b.ID inner join Trs_AddPanelentryQty c on a.Id =c.ID where Ordid = @OrdID  and StyleNo=@styleno and  Stageid = 1 group by Partid,Clrid,CompId,Ordid,CoyId,StyleNo 


update temp_cutpanel_rpt set cutplan  = isnull(x.cutplan,0)  from (

 select sum(CutPlanQty1) as cutplan,ordid,styleno,CmbClrID,PartID  from OrderQtyDtl where OrdID = @OrdID and StyleNo = @styleno group by ordid,styleno,CmbClrID,PartID )x inner join temp_cutpanel_rpt a on x.OrdID = a.ordid and x.StyleNo = a.styleno   and a.clr = x.CmbClrID and a.part = x.PartID 


 update temp_cutpanel_rpt set usedwt = y.usedwt  ,actwt = Y.ACTPCSWGT ,pgmwt = Y.Pgmwt   from (
 select sum(cutqty * (isnull(pcswt,0)/1000)) as usedwt  ,x.ACTPCSWGT ,x.Pgmwt,compID,x.OrdID,x.StyleNo,PartID,ClrCombID  from( 
   select case  when isnull(ACTPCSWGT,0)<>0 then  avg(ACTPCSWGT) else avg(pcswgt) end as pcswt,compID,OrdID,StyleNo,PartID,ClrCombID,isnull(avg(ACTPCSWGT),0) as ACTPCSWGT, avg(pcswgt)  as Pgmwt   from Prog_ClrComb a   inner join Prog_Cns b on a.ID = b.ID  where OrdID = @OrdID  and StyleNo =@styleno  group by ACTPCSWGT,compID,OrdID,StyleNo,PartID,ClrCombID  )x   inner join temp_cutpanel_rpt c on x.OrdID = c.ordid    and x.StyleNo = c.styleno and x.ClrCombID = c.clr and x.PartID = c.part  and x.compID = c.panel group by x.ACTPCSWGT ,x.Pgmwt,compID,x.OrdID,x.StyleNo,PartID,ClrCombID ) y inner join temp_cutpanel_rpt c on Y.OrdID = c.ordid  and Y.StyleNo = c.styleno and Y.ClrCombID = c.clr and Y.PartID = c.part  and Y.compID = c.panel 



    update temp_cutpanel_rpt set stock = y.stock from( select sum(StockQty) as stock,CompID,ColId,Coycode,Ordid,PartId,Styleno  from Panel_StockTableQty inner join Panel_StockTable on Panel_StockTable.PcsStockId = Panel_StockTableQty.PcsStockId  where Ordid = @OrdID and StyleNo=@styleno and StageId = 1 and StockQty <>0  group by  CompID,ColId ,Coycode,Ordid,PartId,Styleno  )y   inner join temp_cutpanel_rpt c on Y.OrdID = c.ordid    and Y.StyleNo = c.styleno and Y.ColId = c.clr and Y.PartID = c.part  and Y.compID = c.panel and y.Coycode = c.unit 


insert into temp_cutpanel_rpt(ordid,styleno ,clr,part,panel,issue,unit,delfor,delunit)  (

select Ordjobno as Ordid,styleno,ColID as ClrCombID,PartID,b.CompID,sum(Pcs) as issuepcs,Coycode,TargetStageID as delfor,ExporterName as delunit from Trs_Pcs1 a inner join trs_pcs2 b on a.ID = b.ID left join Mas_Exporter  on Mas_Exporter.ExpID = a.ToCoyCode    where DelType ='Unit Transfer-Panel'and Ordjobno = @OrdID and StyleNo=@styleno   group by  Ordjobno,styleno,ColID,PartID,b.CompID,TargetStageID,Coycode,ExporterName 

union all 

select Ordid,StyleNo,Clrid as ClrCombID,Partid,CompId,sum(Prodpcs) as issuepcs,CoyId ,Stageid as delfor,'' as delunit from Trs_AddPanelEntry a inner join Trs_AddPanelEntryQty_Component b on a.Id = b.ID inner join Trs_AddPanelentryQty c on a.Id =c.ID where Ordid = @OrdID  and StyleNo=@styleno and CutPanel_Assemble ='P'  and a.SourceStageID  = 1  group by Partid,Clrid,CompId,Ordid,CoyId,StyleNo,Stageid 

union all

select Ordid,StyleNo,Clrid as ClrCombID,b.PartID,CompId,sum(Prodpcs) as issuepcs,CoyId ,Stageid as delfor,'Assemble' as delunit from Trs_AddPanelEntry a inner join Trs_AddPanelAsm_SourceDtl b on a.Id = b.ID inner join Trs_AddPanelentryQty c on a.Id =c.ID where Ordid = @OrdID  and StyleNo=@styleno and CutPanel_Assemble ='A'  and b.SourceStageID=1 group by b.PartID,Clrid,CompId,Ordid,CoyId,StyleNo,Stageid 


union all

select Ordjobno as Ordid,styleno,ColID as ClrCombID,PartID,b.CompID,sum(Pcs) as issuepcs,Coycode,TargetStageID as delfor,Mas_Party.Pname as delunit from Trs_Pcs1 a inner join trs_pcs2 b on a.ID = b.ID  left join Mas_Party on Mas_Party.PID = a.Party   where DelType ='Process'and Ordjobno = @OrdID and StyleNo=@styleno  and b.SourceStageID  = 1   group by  Ordjobno,styleno,ColID,PartID,b.CompID,TargetStageID,Coycode,Pname  )


/* for delete non cutting unit details*/

--delete from temp_cutpanel_rpt where unit not in (select distinct CoyId   from Trs_AddPanelEntry a inner join Trs_AddPanelEntryQty_Component b on a.Id = b.ID inner join Trs_AddPanelentryQty c on a.Id =c.ID where Ordid = @OrdID  and StyleNo=@styleno and  Stageid = 1 ) and Ordid = @OrdID  and StyleNo=@styleno 


--delete from temp_cutpanel_rpt where panel in (
--select panel  from (select distinct Ordid,unit,styleno,clr,part,panel,isnull(sum(cutplan),0) as cutplan from temp_cutpanel_rpt  group by  Ordid,unit,styleno,clr,part,panel ) x where x.cutplan = 0) and delunit='Assemble'

delete from temp_cutpanel_rpt where panel in (select panel from (select distinct panel,unit as cut from temp_cutpanel_rpt group by panel,unit having isnull(sum(cutplan),0) = 0 )x ) and unit in (select unit from (select distinct panel,unit  from temp_cutpanel_rpt group by panel,unit having isnull(sum(cutplan),0) = 0)x) and Ordid = @OrdID  and StyleNo=@styleno 










