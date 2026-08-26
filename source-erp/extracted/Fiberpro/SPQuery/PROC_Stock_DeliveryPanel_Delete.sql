/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  ASLAM

; Last Change Date :  01/06/2023 10.15 AM 

; =============================================  */  

  

CREATE PROCEDURE PROC_Stock_DeliveryPanel_Delete (@Id Int) AS DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@SizeId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@ProcessType Char(1),@RejectionTypeId Int ,@DelType Varchar(30),@FinishedStageID Int  ,@Pcs Int,@LotNo Varchar(15),@LotId int     ,@Prod_Without_Lot_Despatch_WithLot as char(1), @LotwiseStockReqd   char(1) ,@CompID int



   SELECT @LotwiseStockReqd = isNull(LotwiseStockReqd,'Y') from Options   
   SELECT @Prod_Without_Lot_Despatch_WithLot = isNull(Prod_Without_Lot_Despatch_WithLot,'Y') from Options1     
   Select @Coycode = Coycode FROM trs_pcs1 where id=@id     
   SELECT @Ordid = OrdJobNo from trs_pcs1 where id=@id 

      SELECT @LotwiseStockReqd = isNull(LotwiseStock,'Y') from Ordermas2 where Ordid=@Ordid   SELECT @Stageid = TargetStageID from trs_pcs1 where id=@id        
	  SELECT @GodId = GodId from trs_pcs1 where id=@id        

	  SELECT @ProcessType = ProcessType from trs_pcs1 where id=@id        

	  --SELECT @compId = IsNull(CompId,0) from trs_pcs1 where id=@id        



SELECT @RejectionTypeId = RejectionTypeId from trs_pcs1 where id=@id       

Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid  SELECT @DelType = Deltype from Trs_Pcs1 Where id =@Id         

if @DelType ='Sales'        

select @Partyid = 0   

ELSE   

select @Partyid = IsNull(Party,0) from trs_pcs1 where id=@id        /* SELECT Top 1 @FinishedStageID = StageId  From Panel_StockTable A INNER JO

IN Mas_JobWrkComp B ON A.StageId = B.ID INNER JOIN Mas_Dept C ON B.DeptId = C.DeptID INNER JOIN Trs_Pcs1 D ON A.ORdid = D.Ordjobno inner join (select distinct id,styleno from trs_pcs2 where id =@ID ) D1 on D.ID = D1.ID INNER JOIN Panel_StockTableQty E ON 
a.

PcsStockId = E.PcsStockId and a.Styleno = d1.StyleNo Where D.ID  = @ID And SEMIFINISH='F'       */     

BEGIN        

DECLARE LINE_CURSOR CURSOR FOR     

Select Id,StyleNo,Colid,PartId,SizeId,IsNull(lotNo,0) LotNo,Pcs,SourceStageId,IsNull(CompId,0) as CompId FROM Trs_Pcs2 Where ID=@Id

    OPEN LINE_CURSOR        

	FETCH NEXT FROM LINE_CURSOR INTO @Id,@StyleNo,@Colid ,@PartId,@SizeId,@LotNo,@Pcs,@SourceStageId ,@CompId        

	WHILE @@FETCH_STATUS = 0        

	BEGIN  	     

	if ltrim(@LotNo)<>''	      

		SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)        

	else       

	SELECT @LotId = 0          

	if Rtrim(@LotwiseStockReqd) ='N' And RTrim(@Prod_Without_Lot_Despatch_WithLot)='Y'   

	BEGIN    

	SELECT @LotId = 0    

	END      

	If @PartyId=0  and (@DelType='Despatch' Or @DelType ='Sales')       

	Begin       	   

	if @DelType ='Sales'  

	begin  

	SELECT Top 1 @FinishedStageID = @SourceStageId    

	end  

	else  

	begin  

	SELECT Top 1 @FinishedStageID = -3    

	end  

	UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_Pcs1 On Panel_StockTable.Coycode=Trs_Pcs1.Coycode 
And Panel_StockTable.OrdId=Trs_Pcs1.Ordjobno And Panel_StockTable.StageId=@FinishedStageID And Panel_StockTable.GodId=Trs_Pcs1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId  and IsNull(GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 And Panel_StockTable.LotId = @LotId WHERE Panel_StockTable.coycode=Trs_Pcs1.Coycode And Panel_StockTable.Ordid=Trs_Pcs1.Ordjobno and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotId and Panel_StockTable.Stageid=@FinishedStageID And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_Pcs1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 and Partyid=0 And Trs_Pcs1.Id=@Id        

	End      

	If @PartyId<>0      and @DelType <> 'JobWork Return'     

	Begin   /*Insert into tmp_trg Values ('START')*/      

	UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty-@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_Pcs1 On Panel_StockTable.Coycode=Trs_Pcs1.Coycode 
And Panel_StockTable.OrdId=Trs_Pcs1.Ordjobno And Panel_StockTable.StageId=Trs_Pcs1.TargetStageId  And Panel_StockTable.GodId=Trs_Pcs1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotId And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId 

And Panel_StockTableQty.CompId=@compId 

and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End WHERE Panel_StockTable.coycode=Trs_Pcs1.Coycode And Panel_StockTable
.Ordid=Trs_Pcs1.Ordjobno and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotId and Panel_StockTable.Stageid=Trs_Pcs1.TargetStageid And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_Pcs1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId  and IsNull(GoodPcsFlag,'G')= Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_Pcs1.Id=@Id        

End         



If @SourceStageid<>0 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' OR (Select Rtrim(IsNull(PcsType,'Piece')) From Mas_JobWrkComp Where Id=@StageId)='Bit'  Or (@Stageid=@SourceStageid)  OR  (Select IsNull(PcsType,'Piece
') From Mas_JobWrkComp Where Id=@StageId)='Panel'



Begin  /*Insert into tmp_trg Values ('START1')*/     

If EXISTS (select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=0)     

BEGIN      

if @DelType<>'Supplier Receipt Rejection' 	  

BEGIN 	/*Insert into tmp_trg Values ('START2')*/ 	   

Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0  	    

If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId  and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)  	    

Begin  	/*Insert into tmp_trg Values ('START3')*/ 

	  UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_Pcs1 On Panel_StockTable.Coycode=Trs_Pcs1.Coycode And Panel_StockTable.OrdId=Trs_Pcs1.Ordjobno And Panel_StockTable.GodId=Trs_Pcs1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotId And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId  and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End WHERE Panel_StockTable.coycode=Trs_Pcs1.Coycode And Panel_StockTable.Ordid=Trs_Pcs1.Ordjobno and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotId And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_Pcs1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId  and IsNull(GoodPcsFlag,'G')=

Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=0 And Panel_StockTable.StageId=@SourceStageId And Trs_Pcs1.Id=@Id 	

End     

Else      

Begin 	/*Insert into tmp_trg Values ('START4')*/ 	  

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId,CompId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End
,@CompId)  	   

End     

End     

Else     

Begin /*Supplier Receipt Rejection */ 	/*Insert into tmp_trg Values ('START21')*/ 	   

Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @Lotid and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0  	    

If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @LotID and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId and IsNull(GoodPcsFlag,'G')= 'G' and IsNull(RejectionTypeId,0)=0)      

Begin /*Insert into tmp_trg Values ('START31')*/ 		   

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_Pcs1 On Panel_StockTable.Coycode=Trs_Pcs1.Coycode And Panel_StockTable.OrdId=Trs_Pcs1.Ordjobno And Panel_StockTable.GodId=Trs_Pcs1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotId And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId  and IsNull(GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_Pcs1.Coycode And Panel_StockTable.Ordid=Trs_Pcs1.Ordjobno and Panel_StockTable.
StyleNo=@StyleNo And Panel_StockTable.LotId = @LotId And Panel_StockTable.PartId=@PartId and  Panel_StockTable.GodId=Trs_Pcs1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@compId  and IsNull(GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 and Partyid=0 And Panel_StockTable.StageId=@SourceStageId And Trs_Pcs1.Id=@Id  	  

End  	  

Else     

Begin /*Insert into tmp_trg Values ('START41')*/ 	   

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId,CompID) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End
,@compId)  

End   

End   

End    

Else    

Begin  /*Insert into tmp_trg Values ('START5')*/      

Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Panel_StockTable     

INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,0,@LotID)      

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId,CompId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End
,@CompId)     

End      

End       

FETCH NEXT FROM LINE_CURSOR INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs,@SourceStageId ,@CompID      

END         

CLOSE LINE_CURSOR         

DEALLOCATE LINE_CURSOR           

SET NOCOUNT OFF    

END 
